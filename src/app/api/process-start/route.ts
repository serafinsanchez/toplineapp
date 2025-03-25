import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authOptions } from '@/lib/auth';
import { getUserCredits } from '@/lib/supabase';
import { hasUsedFreeTrial, recordFreeTrial } from '@/lib/free-trial';
import { uploadFile, createJob } from '@/lib/audio-processor';

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

// Track processing jobs
interface ProcessingJob {
  jobId: string;
  filePath: string;
  userId: string | null;
  status: 'CREATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error?: string;
  acapellaPath?: string;
  instrumentalPath?: string;
  createdAt: Date;
}

// In-memory storage for jobs (in real production, use a database)
const processingJobs = new Map<string, ProcessingJob>();

export async function POST(request: NextRequest) {
  // Track elapsed time
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting process job request`);
  
  try {
    // Get the request body
    const body = await request.json();
    const { filePath, bypassToken, authenticated, sessionStatus, userId: clientSideUserId } = body;

    console.log(`Received request for file path: ${filePath?.substring(0, 50)}...`);

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'Missing file path' },
        { status: 400 }
      );
    }

    // Fix file path for Vercel environment
    const fixedFilePath = fixFilePath(filePath);
    console.log(`Original file path: ${filePath}`);
    console.log(`Fixed file path: ${fixedFilePath}`);

    // Check if the file exists
    if (!fs.existsSync(fixedFilePath)) {
      console.error(`File not found at path: ${fixedFilePath}`);
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Log file size
    try {
      const stats = fs.statSync(fixedFilePath);
      console.log(`File size: ${stats.size} bytes (${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB)`);
    } catch (statError) {
      console.error('Error checking file size:', statError);
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
      // Start the upload process (but don't wait for it to complete)
      // We'll just verify that the API is reachable
      const downloadUrl = await uploadFile(fixedFilePath);
      
      // Create a job in MusicAI
      const jobId = await createJob(downloadUrl);
      
      // Store the job for status checking
      processingJobs.set(processId, {
        jobId,
        filePath: fixedFilePath,
        userId,
        status: 'PROCESSING',
        createdAt: new Date()
      });
      
      // Create a job-specific output directory
      const outputDir = path.join(RESULTS_DIR, jobId);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      console.log(`Job started with process ID: ${processId}, MusicAI job ID: ${jobId}`);
      
      // Return immediately with the process ID
      return NextResponse.json({
        success: true,
        processId,
        message: 'Processing started'
      });
    } catch (error: any) {
      console.error('Error starting processing:', error);
      
      // Store the failed job
      processingJobs.set(processId, {
        jobId: 'failed',
        filePath: fixedFilePath,
        userId,
        status: 'FAILED',
        error: error.message,
        createdAt: new Date()
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

// Export for use in other routes
export { processingJobs };

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