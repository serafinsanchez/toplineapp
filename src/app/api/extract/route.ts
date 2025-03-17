import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import fs from 'fs';
import path from 'path';
import { authOptions } from '@/lib/auth';
import { processAudioFile, cleanupFiles } from '@/lib/audio-processor';
import { getUserCredits } from '@/lib/supabase';
import { hasUsedFreeTrial, recordFreeTrial } from '@/lib/free-trial';

// Special bypass token for testing - in production, use a more secure approach
const BYPASS_TOKEN = 'topline-dev-testing-bypass';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { filePath, bypassToken } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: 'Hmm, we can\'t find your audio file. Did it get lost in the digital ether?' },
        { status: 400 }
      );
    }

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'We looked everywhere, but your file seems to have pulled a disappearing act!' },
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
          { error: 'You\'re out of credits! Time to power up your account to keep the music flowing.' },
          { status: 403 }
        );
      }
    } else {
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
      { error: error.message || 'Oops! Our audio wizards hit a snag while separating your tracks. Let\'s try again!' },
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