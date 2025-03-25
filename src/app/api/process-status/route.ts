import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { processingJobs } from '../process-start/route';
import { checkJobStatus, downloadStems, cleanupJob, cleanupFiles, deductCredit } from '@/lib/audio-processor';

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

    // Check if the job exists
    const job = processingJobs.get(processId);
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    console.log(`Checking status for process ID: ${processId}, MusicAI job ID: ${job.jobId}`);

    // If job has already completed or failed, return the status
    if (job.status === 'COMPLETED') {
      if (!job.acapellaPath || !job.instrumentalPath) {
        return NextResponse.json(
          { success: false, error: 'Job completed but stems are missing' },
          { status: 500 }
        );
      }

      try {
        // Read the output files
        const acapellaBuffer = fs.readFileSync(job.acapellaPath);
        const instrumentalBuffer = fs.readFileSync(job.instrumentalPath);
        
        // Convert buffers to base64
        const acapellaBase64 = acapellaBuffer.toString('base64');
        const instrumentalBase64 = instrumentalBuffer.toString('base64');
        
        // Return the results
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
      } catch (readError: any) {
        console.error('Error reading stem files:', readError);
        return NextResponse.json(
          { success: false, error: 'Error reading stem files', status: 'ERROR' },
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
      const musicAiJob = await checkJobStatus(job.jobId);
      const status = musicAiJob.status;
      
      if (status === 'SUCCEEDED') {
        console.log(`Job ${job.jobId} has completed. Downloading results...`);
        
        // Create job-specific output directory
        const outputDir = path.join(RESULTS_DIR, job.jobId);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Download stems
        const stemResult = await downloadStems(musicAiJob, outputDir);
        
        // Clean up the MusicAI job
        await cleanupJob(job.jobId);
        
        // Update job status
        job.status = 'COMPLETED';
        job.acapellaPath = stemResult.acapellaPath;
        job.instrumentalPath = stemResult.instrumentalPath;
        processingJobs.set(processId, job);
        
        // Deduct credit if user is logged in
        if (job.userId) {
          await deductCredit(job.userId);
        }
        
        // Read the output files
        const acapellaBuffer = fs.readFileSync(stemResult.acapellaPath);
        const instrumentalBuffer = fs.readFileSync(stemResult.instrumentalPath);
        
        // Convert buffers to base64
        const acapellaBase64 = acapellaBuffer.toString('base64');
        const instrumentalBase64 = instrumentalBuffer.toString('base64');
        
        // Log success
        console.log(`Successfully processed job ${processId}`);
        
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
        // Update job status
        job.status = 'FAILED';
        job.error = musicAiJob.error || 'Job failed in MusicAI';
        processingJobs.set(processId, job);
        
        return NextResponse.json({
          success: false,
          status: 'FAILED',
          error: job.error
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