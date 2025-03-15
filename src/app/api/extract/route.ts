import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import fs from 'fs';
import path from 'path';
import { authOptions } from '@/lib/auth';
import { processAudioFile, cleanupFiles } from '@/lib/audio-processor';
import { getUserCredits } from '@/lib/supabase';
import { hasUsedFreeTrial, recordFreeTrial } from '@/lib/free-trial';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { filePath } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: 'No file path provided' },
        { status: 400 }
      );
    }

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Get the user session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    // If user is logged in, check if they have enough credits
    if (userId) {
      const credits = await getUserCredits(userId);
      
      if (credits < 1) {
        return NextResponse.json(
          { error: 'Insufficient credits. Please purchase more credits to continue.' },
          { status: 403 }
        );
      }
    } else {
      // If user is not logged in, check if they've used their free trial
      const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
      const hasUsed = await hasUsedFreeTrial(clientIp);
      
      if (hasUsed) {
        return NextResponse.json(
          { error: 'Free trial already used. Please create an account to continue.' },
          { status: 403 }
        );
      }
      
      // Record free trial usage
      await recordFreeTrial(clientIp, request.headers.get('user-agent'));
    }

    // Process the audio file
    const { acapellaPath, instrumentalPath } = await processAudioFile(filePath, userId);

    // Read the output files
    const acapellaBuffer = fs.readFileSync(acapellaPath);
    const instrumentalBuffer = fs.readFileSync(instrumentalPath);

    // Create response with file data
    const response = NextResponse.json({
      success: true,
      acapella: {
        name: 'acapella.wav',
        type: 'audio/wav',
        data: acapellaBuffer.toString('base64'),
      },
      instrumental: {
        name: 'instrumental.wav',
        type: 'audio/wav',
        data: instrumentalBuffer.toString('base64'),
      },
    });

    // Clean up temporary files
    cleanupFiles([filePath, acapellaPath, instrumentalPath]);

    return response;
  } catch (error: any) {
    console.error('Error extracting stems:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to extract stems' },
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
    responseLimit: '100mb',
  },
}; 