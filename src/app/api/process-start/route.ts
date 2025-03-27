import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authOptions } from '@/lib/auth';
import { getUserCredits, createServiceRoleClient } from '@/lib/supabase';
import { hasUsedFreeTrial, recordFreeTrial } from '@/lib/free-trial';
import { uploadFile, createJob, cleanupFiles } from '@/lib/audio-processor';

// Special bypass token for testing
const BYPASS_TOKEN = 'topline-dev-testing-bypass';

// Temporary directory for uploaded files - use /tmp for Vercel serverless environment
const TEMP_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'tmp');
const RESULTS_DIR = path.join(TEMP_DIR, 'results');

// Use /tmp for file access in Vercel
const fixFilePath = (filePath: string): string => {
  if (process.env.VERCEL) {
    // If the path starts with /var/task/tmp, replace with /tmp
    if (filePath.startsWith('/var/task/tmp')) {
      return filePath.replace('/var/task/tmp', '/tmp');
    }
    
    // If the path includes the project directory path + /tmp, replace with /tmp
    const projectTmpPath = path.join(process.cwd(), 'tmp');
    if (filePath.includes(projectTmpPath)) {
      return filePath.replace(projectTmpPath, '/tmp');
    }
  }
  return filePath;
};

export async function POST(request: NextRequest) {
  // Track elapsed time
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting process job request`);
  
  try {
    // Get the request body
    const body = await request.json();
    const { filePath, url, bypassToken, authenticated, sessionStatus, userId: clientSideUserId } = body;

    console.log(`Received request with filePath: ${filePath?.substring(0, 50)}... and url: ${url?.substring(0, 50)}...`);

    if (!filePath && !url) {
      return NextResponse.json(
        { success: false, error: 'Missing file path or URL' },
        { status: 400 }
      );
    }

    // If we have a URL, we'll use that directly for processing
    // If we have a file path, we'll need to fix it for Vercel environment
    const fileToProcess = url || fixFilePath(filePath);
    console.log(`File to process: ${fileToProcess}`);

    // Only check file existence if we're using a file path (not a URL)
    if (!url && !fs.existsSync(fileToProcess)) {
      console.error(`File not found at path: ${fileToProcess}`);
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Log file size only if we're using a file path
    if (!url) {
      try {
        const stats = fs.statSync(fileToProcess);
        console.log(`File size: ${stats.size} bytes (${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB)`);
      } catch (statError) {
        console.error('Error checking file size:', statError);
      }
    }

    // Get the user session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;
    
    // Handle credits and free trial checks
    if (userId) {
      const credits = await getUserCredits(userId);
      if (credits < 1) {
        return NextResponse.json(
          { success: false, error: 'Not enough credits' },
          { status: 403 }
        );
      }
    } else {
      // Check if bypass token is provided for testing
      const isTestingBypass = bypassToken === BYPASS_TOKEN;
      
      if (!isTestingBypass) {
        // If user is not logged in, check if they've used their free trial
        const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
        const hasUsed = await hasUsedFreeTrial(clientIp);
        
        if (hasUsed) {
          return NextResponse.json(
            { success: false, error: 'Free trial already used' },
            { status: 403 }
          );
        }
        
        // Record free trial usage
        const userAgent = request.headers.get('user-agent') || undefined;
        await recordFreeTrial(clientIp, userAgent);
      }
    }

    // Generate processing ID
    const processId = uuidv4();

    try {
      // If we have a URL, use it directly, otherwise upload the file
      const downloadUrl = url || await uploadFile(fileToProcess);
      
      // Create a job in MusicAI
      const jobId = await createJob(downloadUrl);
      
      // Create a job-specific output directory
      const outputDir = path.join(RESULTS_DIR, jobId);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Store the job in Supabase
      const supabaseAdmin = createServiceRoleClient();
      const { error: insertError } = await supabaseAdmin
        .from('processing_jobs')
        .insert({
          process_id: processId,
          job_id: jobId,
          user_id: userId,
          status: 'PROCESSING'
        });

      if (insertError) {
        console.error('Error inserting job into database:', insertError);
        throw new Error('Failed to store job information');
      }
      
      console.log(`Job started with process ID: ${processId}, MusicAI job ID: ${jobId}`);
      
      // Clean up the original uploaded file since it's no longer needed
      try {
        await cleanupFiles([fileToProcess]);
        console.log(`Cleaned up original uploaded file: ${fileToProcess}`);
      } catch (cleanupError) {
        console.warn('Failed to clean up original uploaded file:', cleanupError);
        // Continue despite cleanup errors
      }
      
      // Return immediately with the process ID
      return NextResponse.json({
        success: true,
        processId,
        message: 'Processing started'
      });
    } catch (error: any) {
      console.error('Error starting processing:', error);
      
      // Store the failed job in Supabase
      const supabaseAdmin = createServiceRoleClient();
      await supabaseAdmin
        .from('processing_jobs')
        .insert({
          process_id: processId,
          job_id: 'failed',
          user_id: userId,
          status: 'FAILED',
          error: error.message
        });
      
      return NextResponse.json(
        { success: false, error: 'Failed to start processing' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in process-start:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

// Set the maximum request body size and timeout
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  runtime: 'nodejs',
  maxDuration: 30, // Only needs 30 seconds to start the job
}; 