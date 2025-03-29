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

      try {
        // Check if the WAV files still exist
        const acapellaExists = await fsExistsAsync(job.acapella_path);
        const instrumentalExists = await fsExistsAsync(job.instrumental_path);

        if (!acapellaExists || !instrumentalExists) {
          console.log(`WAV files for job ${processId} no longer exist. They may have been processed already.`);
          return NextResponse.json({
            success: true,
            status: 'COMPLETED',
            message: 'Files were already processed'
          });
        }
        
        // Read the WAV files directly
        const acapellaData = await readFileAsync(job.acapella_path, { encoding: 'base64' });
        const instrumentalData = await readFileAsync(job.instrumental_path, { encoding: 'base64' });
        
        // Clean up the files
        await cleanupFiles([
          job.acapella_path,
          job.instrumental_path
        ]);
        
        return NextResponse.json({
          success: true,
          status: 'COMPLETED',
          acapella: {
            data: acapellaData,
            type: 'audio/wav'
          },
          instrumental: {
            data: instrumentalData,
            type: 'audio/wav'
          }
        });
      } catch (error) {
        console.error('Error processing audio files:', error);
        return NextResponse.json(
          { success: false, error: 'Error processing audio files' },
          { status: 500 }
        );
      }
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