import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createServiceRoleClient } from '@/lib/supabase';
import { checkJobStatus, downloadStems, cleanupJob, cleanupFiles, deductCredit } from '@/lib/audio-processor';
import { convertWavToMp3 } from '@/lib/audio-converter';
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

      // Check if we already have MP3 paths stored
      const acapella_mp3_path = (job as any).acapella_mp3_path;
      const instrumental_mp3_path = (job as any).instrumental_mp3_path;
      
      if (acapella_mp3_path && instrumental_mp3_path) {
        // If MP3 paths exist but files don't exist anymore, just return success
        // This handles the case where we've already sent the files and cleaned them up
        return NextResponse.json({
          success: true,
          status: 'COMPLETED',
          message: 'Files were already converted and sent'
        });
      }

      try {
        // First check if the WAV files still exist
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

        console.log('Converting WAV files to MP3...');
        
        // Convert WAV files to MP3
        const acapellaMp3Path = await convertWavToMp3(job.acapella_path);
        const instrumentalMp3Path = await convertWavToMp3(job.instrumental_path);
        
        // Update the database with MP3 paths
        const { error: updateError } = await supabaseAdmin
          .from('processing_jobs')
          .update({
            acapella_mp3_path: acapellaMp3Path,
            instrumental_mp3_path: instrumentalMp3Path,
            updated_at: new Date().toISOString()
          })
          .eq('process_id', processId);
          
        if (updateError) {
          console.error('Error updating MP3 paths:', updateError);
        }
        
        // Read the converted MP3 files
        const acapellaData = await readFileAsync(acapellaMp3Path, { encoding: 'base64' });
        const instrumentalData = await readFileAsync(instrumentalMp3Path, { encoding: 'base64' });
        
        // Clean up all files (WAV and MP3)
        await cleanupFiles([
          job.acapella_path,
          job.instrumental_path,
          acapellaMp3Path,
          instrumentalMp3Path
        ]);
        
        return NextResponse.json({
          success: true,
          status: 'COMPLETED',
          acapella: {
            data: acapellaData,
            type: 'audio/mp3'
          },
          instrumental: {
            data: instrumentalData,
            type: 'audio/mp3'
          }
        });
      } catch (conversionError) {
        console.error('Error converting audio files:', conversionError);
        return NextResponse.json(
          { success: false, error: 'Error converting audio files' },
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
        
        // Log success
        console.log(`Successfully processed job ${processId}`);
        
        // We won't clean up the files here since we might need them for MP3 conversion
        // in a subsequent request
        
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
      { success: false, error: 'Server error' },
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