import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createServiceRoleClient } from '@/lib/supabase';
import { checkJobStatus, downloadStems, cleanupJob, cleanupFiles, deductCredit } from '@/lib/audio-processor';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);
const fsExistsAsync = promisify(fs.exists);

// Temporary directory for uploaded files - use /tmp for Vercel serverless environment
const TEMP_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'tmp');
const RESULTS_DIR = path.join(TEMP_DIR, 'results');

// Add this near the top of the file with other constants
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB max file size for processing

export async function GET(request: NextRequest) {
  try {
    // Get the process ID from the query string
    const searchParams = request.nextUrl.searchParams;
    const processId = searchParams.get('processId');

    if (!processId) {
      return NextResponse.json(
        { success: false, error: 'Missing process ID' },
        { status: 400 }
      );
    }

    // Get the job from Supabase
    const supabaseAdmin = createServiceRoleClient();
    const { data: job, error: fetchError } = await supabaseAdmin
      .from('processing_jobs')
      .select('*')
      .eq('process_id', processId)
      .single();

    if (fetchError || !job) {
      console.error('Error fetching job:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    console.log(`Checking status for process ID: ${processId}, MusicAI job ID: ${job.job_id}`);

    // If job has already completed or failed, return the status
    if (job.status === 'COMPLETED') {
      if (!job.acapella_path || !job.instrumental_path) {
        return NextResponse.json(
          { success: false, error: 'Job completed but stems are missing' },
          { status: 500 }
        );
      }

      // Don't try to read the files if they're already processed
      // Just inform the client that the job is complete, but files were already processed
      return NextResponse.json({
        success: true,
        status: 'COMPLETED',
        message: 'Job completed successfully, but files are no longer available. Refresh the page and try again.'
      });
    } else if (job.status === 'FAILED') {
      return NextResponse.json({
        success: false,
        status: 'FAILED',
        error: job.error || 'Job failed'
      });
    }

    // Job is still in progress - check the current status
    try {
      const musicAiJob = await checkJobStatus(job.job_id);
      const status = musicAiJob.status;
      
      if (status === 'SUCCEEDED') {
        console.log(`Job ${job.job_id} has completed. Downloading results...`);
        
        // Create job-specific output directory
        const outputDir = path.join(RESULTS_DIR, job.job_id);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Download stems
        const stemResult = await downloadStems(musicAiJob, outputDir);
        
        // Clean up the MusicAI job
        await cleanupJob(job.job_id);
        
        // Update job status in Supabase
        const { error: updateError } = await supabaseAdmin
          .from('processing_jobs')
          .update({
            status: 'COMPLETED',
            acapella_path: stemResult.acapellaPath,
            instrumental_path: stemResult.instrumentalPath,
            updated_at: new Date().toISOString()
          })
          .eq('process_id', processId);

        if (updateError) {
          console.error('Error updating job status:', updateError);
          throw new Error('Failed to update job status');
        }
        
        // Deduct credit if user is logged in
        if (job.user_id) {
          await deductCredit(job.user_id);
        }
        
        // Check file sizes before reading to prevent memory issues
        const acapellaStats = fs.statSync(stemResult.acapellaPath);
        const instrumentalStats = fs.statSync(stemResult.instrumentalPath);
        const totalSize = acapellaStats.size + instrumentalStats.size;
        
        console.log(`Acapella file size: ${acapellaStats.size} bytes`);
        console.log(`Instrumental file size: ${instrumentalStats.size} bytes`);
        
        if (totalSize > MAX_FILE_SIZE) {
          console.warn(`Files are too large (${totalSize} bytes) to return via API. Limit is ${MAX_FILE_SIZE} bytes.`);
          // Update job status to FAILED to indicate the issue
          await supabaseAdmin
            .from('processing_jobs')
            .update({
              status: 'FAILED',
              error: 'Files are too large to return via API',
              updated_at: new Date().toISOString()
            })
            .eq('process_id', processId);
            
          return NextResponse.json({
            success: false,
            status: 'FAILED',
            error: 'Files are too large to return. Try with a shorter audio file.'
          });
        }
        
        // Read the output files
        const acapellaBuffer = fs.readFileSync(stemResult.acapellaPath);
        const instrumentalBuffer = fs.readFileSync(stemResult.instrumentalPath);
        
        // Convert buffers to base64
        const acapellaBase64 = acapellaBuffer.toString('base64');
        const instrumentalBase64 = instrumentalBuffer.toString('base64');
        
        // Log success and data sizes for debugging
        console.log(`Successfully processed job ${processId}`);
        console.log(`Acapella base64 data length: ${acapellaBase64.length}`);
        console.log(`Instrumental base64 data length: ${instrumentalBase64.length}`);
        
        // After returning the completed job response with base64 data, schedule cleanup for a later time
        // Schedule cleanup to happen after response is sent
        setTimeout(async () => {
          try {
            console.log(`Scheduling cleanup of files for job ${job.job_id}...`);
            await cleanupFiles([stemResult.acapellaPath, stemResult.instrumentalPath]);
            console.log(`Cleanup completed for job ${job.job_id}`);
          } catch (cleanupError) {
            console.error(`Error during delayed cleanup: ${cleanupError}`);
          }
        }, 10000); // 10 seconds delay
        
        return NextResponse.json({
          success: true,
          status: 'COMPLETED',
          acapella: {
            data: acapellaBase64,
            filename: 'acapella.wav',
            type: 'audio/wav'
          },
          instrumental: {
            data: instrumentalBase64,
            filename: 'instrumental.wav',
            type: 'audio/wav'
          }
        });
      } else if (status === 'FAILED') {
        // Update job status in Supabase
        const { error: updateError } = await supabaseAdmin
          .from('processing_jobs')
          .update({
            status: 'FAILED',
            error: musicAiJob.error || 'Job failed in MusicAI',
            updated_at: new Date().toISOString()
          })
          .eq('process_id', processId);

        if (updateError) {
          console.error('Error updating job status:', updateError);
        }
        
        return NextResponse.json({
          success: false,
          status: 'FAILED',
          error: musicAiJob.error || 'Job failed in MusicAI'
        });
      } else {
        // Job is still in progress
        return NextResponse.json({
          success: true,
          status: 'PROCESSING',
          message: `Job is ${status.toLowerCase()}`
        });
      }
    } catch (error: any) {
      console.error(`Error checking job status for ${processId}:`, error);
      return NextResponse.json({
        success: false,
        status: 'ERROR',
        error: 'Error checking job status'
      });
    }
  } catch (error: any) {
    console.error('Error in process-status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Set the maximum request body size and timeout
export const config = {
  api: {
    responseLimit: '100mb',
  },
  runtime: 'nodejs',
  maxDuration: 30, // Only needs 30 seconds to check status
}; 