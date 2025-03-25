import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import fs from 'fs';
import path from 'path';
import { authOptions } from '@/lib/auth';
import { getUserCredits } from '@/lib/supabase';
import { hasUsedFreeTrial, recordFreeTrial } from '@/lib/free-trial';
import { processAudioFile, cleanupFiles } from '@/lib/audio-processor';

// Special bypass token for testing - in production, use a more secure approach
const BYPASS_TOKEN = 'topline-dev-testing-bypass';

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
  // Track elapsed time to help diagnose timeouts
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting extraction request`);
  
  try {
    // Get the request body
    const body = await request.json();
    const { filePath, bypassToken, authenticated, sessionStatus, userId: clientSideUserId } = body;

    console.log(`[${new Date().toISOString()}] Received request for file path: ${filePath?.substring(0, 50)}...`);

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'Hmm, we can\'t find your audio file. Did it get lost in the digital ether?' },
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
        { success: false, error: 'We looked everywhere, but your file seems to have pulled a disappearing act!' },
        { status: 404 }
      );
    }

    // Log file size to help diagnose timeouts
    try {
      const stats = fs.statSync(fixedFilePath);
      console.log(`File size: ${stats.size} bytes (${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB)`);
      
      // Warn about large files that might cause timeouts
      if (stats.size > 10 * 1024 * 1024) {
        console.warn(`⚠️ Large file detected (${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB). This may time out.`);
      }
    } catch (statError) {
      console.error('Error checking file size:', statError);
    }

    // Get the user session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;
    
    // Add debugging for session issues
    console.log('Authentication Debug:', {
      sessionFromServer: !!session,
      userId,
      clientSideAuthenticated: authenticated,
      clientSideSessionStatus: sessionStatus,
      clientSideUserId
    });

    // If user is logged in, check if they have enough credits
    if (userId) {
      const credits = await getUserCredits(userId);
      console.log(`User ${userId} has ${credits} credits`);
      
      if (credits < 1) {
        return NextResponse.json(
          { error: 'You\'re out of credits! Time to power up your account to keep the music flowing.' },
          { status: 403 }
        );
      }
    } else {
      // Not authenticated - check if server-side session and client-side state are inconsistent
      if (authenticated === true && clientSideUserId) {
        console.error('Session inconsistency detected! Client thinks user is authenticated but server does not.');
        return NextResponse.json(
          { error: 'Session authentication error. Please try signing out and back in.' },
          { status: 401 }
        );
      }
      
      // Check if bypass token is provided for testing
      const isTestingBypass = bypassToken === BYPASS_TOKEN;
      
      if (!isTestingBypass) {
        // If user is not logged in and no bypass token, check if they've used their free trial
        const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
        const hasUsed = await hasUsedFreeTrial(clientIp);
        
        if (hasUsed) {
          return NextResponse.json(
            { error: 'Looks like you\'ve already jammed with our free trial! Create an account to unlock unlimited access.' },
            { status: 403 }
          );
        }
        
        // Record free trial usage
        const userAgent = request.headers.get('user-agent') || undefined;
        await recordFreeTrial(clientIp, userAgent);
      } else {
        console.log('⚠️ Free trial check bypassed for testing');
      }
    }

    // Track files to clean up at the end
    const filesToCleanup = [fixedFilePath];

    console.log(`[${new Date().toISOString()}] Starting audio processing (elapsed: ${(Date.now() - startTime) / 1000}s)`);
    
    // Process the audio file
    const { acapellaPath, instrumentalPath } = await processAudioFile(fixedFilePath, userId);
    filesToCleanup.push(acapellaPath, instrumentalPath);

    console.log(`[${new Date().toISOString()}] Audio processing complete (elapsed: ${(Date.now() - startTime) / 1000}s)`);
    console.log(`Reading output files from: ${acapellaPath} and ${instrumentalPath}`);

    // Read the output files - with added error handling
    let acapellaBuffer: Buffer, instrumentalBuffer: Buffer;
    
    try {
      // Verify files exist before trying to read them
      if (!fs.existsSync(acapellaPath)) {
        throw new Error(`Acapella file not found at path: ${acapellaPath}`);
      }
      if (!fs.existsSync(instrumentalPath)) {
        throw new Error(`Instrumental file not found at path: ${instrumentalPath}`);
      }
      
      acapellaBuffer = fs.readFileSync(acapellaPath);
      instrumentalBuffer = fs.readFileSync(instrumentalPath);
      
      console.log(`Read acapella file: ${acapellaPath}, size: ${acapellaBuffer.length} bytes`);
      console.log(`Read instrumental file: ${instrumentalPath}, size: ${instrumentalBuffer.length} bytes`);
    } catch (readError: any) {
      console.error('Error reading stem files:', readError);
      throw new Error(`Failed to read output files: ${readError.message}`);
    }

    // Safely convert buffers to base64
    let acapellaBase64: string, instrumentalBase64: string;
    try {
      acapellaBase64 = acapellaBuffer.toString('base64');
      instrumentalBase64 = instrumentalBuffer.toString('base64');
      
      // Verify data is valid to help diagnose the 'includes is not a function' error
      if (typeof acapellaBase64 !== 'string' || typeof instrumentalBase64 !== 'string') {
        console.error('❌ Invalid base64 conversion:', {
          acapellaType: typeof acapellaBase64, 
          instrumentalType: typeof instrumentalBase64
        });
        throw new Error('Error converting audio to base64');
      }
      
      if (acapellaBase64.length === 0 || instrumentalBase64.length === 0) {
        console.error('❌ Empty base64 data');
        throw new Error('Error converting audio to base64: empty result');
      }
      
      console.log(`Base64 conversion successful: acapella (${acapellaBase64.length} chars), instrumental (${instrumentalBase64.length} chars)`);
    } catch (base64Error: any) {
      console.error('Error converting to base64:', base64Error);
      throw new Error(`Failed to convert audio data: ${base64Error.message}`);
    }

    // Create response with both files as base64
    const responseData = {
      success: true,
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
    };
    
    // Clean up temporary files
    try {
      await cleanupFiles(filesToCleanup);
      console.log('Temporary files cleaned up successfully');
    } catch (cleanupError) {
      console.warn('❗ Failed to clean up some temporary files:', cleanupError);
      // Continue despite cleanup errors
    }
    
    console.log(`[${new Date().toISOString()}] Request completed successfully in ${(Date.now() - startTime) / 1000}s`);
    
    const response = NextResponse.json(responseData);
    return response;
  } catch (error: any) {
    const elapsed = (Date.now() - startTime) / 1000;
    console.error(`[${new Date().toISOString()}] Error extracting stems after ${elapsed}s:`, error);
    
    // Add stack trace for better debugging in production
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    let errorMessage = 'Oops! Our audio wizards hit a snag while separating your tracks. Let\'s try again!';
    let statusCode = 500;
    
    // More specific error message for common errors
    if (error.message.includes('timed out') || elapsed >= 240) {
      errorMessage = 'The process is taking longer than expected. Please try with a shorter audio file (under 5 minutes).';
      statusCode = 504; // Gateway Timeout
    } else if (error.message.includes('File not found')) {
      errorMessage = 'We couldn\'t find your audio file. It might have been removed or expired.';
      statusCode = 404; 
    } else if (error.message.includes('out of memory')) {
      errorMessage = 'We ran out of memory processing your file. Please try a smaller file.';
      statusCode = 413; // Payload Too Large
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

// Set the maximum request body size and timeout
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: '100mb',
  },
  runtime: 'nodejs',
  maxDuration: 300, // 5 minutes
}; 