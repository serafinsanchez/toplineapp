import { NextRequest, NextResponse } from 'next/server';
import { convertWavToMp3, convertToMp3WithMetadata } from '@/lib/audio-converter';
import path from 'path';
import fs from 'fs';

// Temporary directory for test files
const TEMP_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'tmp');

export async function POST(request: NextRequest) {
  try {
    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    
    // Save the uploaded WAV file
    const wavPath = path.join(TEMP_DIR, `test_${Date.now()}.wav`);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(wavPath, buffer);
    
    console.log('Original file size:', buffer.length);
    
    try {
      // Test basic conversion
      console.log('Testing basic conversion...');
      const mp3Path = await convertWavToMp3(wavPath);
      
      // Test metadata conversion
      console.log('Testing metadata conversion...');
      const mp3WithMetadataPath = await convertToMp3WithMetadata(wavPath, {
        title: 'Test Song',
        artist: 'Test Artist'
      });
      
      // Get file sizes
      const mp3Size = fs.statSync(mp3Path).size;
      const mp3WithMetadataSize = fs.statSync(mp3WithMetadataPath).size;
      
      console.log('MP3 file size:', mp3Size);
      console.log('MP3 with metadata file size:', mp3WithMetadataSize);
      
      // Read the converted files
      const mp3Data = fs.readFileSync(mp3Path, { encoding: 'base64' });
      const mp3WithMetadataData = fs.readFileSync(mp3WithMetadataPath, { encoding: 'base64' });
      
      // Clean up
      fs.unlinkSync(wavPath);
      fs.unlinkSync(mp3Path);
      fs.unlinkSync(mp3WithMetadataPath);
      
      return NextResponse.json({
        success: true,
        results: {
          originalSize: buffer.length,
          mp3Size,
          mp3WithMetadataSize,
          mp3: {
            data: mp3Data,
            type: 'audio/mp3'
          },
          mp3WithMetadata: {
            data: mp3WithMetadataData,
            type: 'audio/mp3'
          }
        }
      });
    } catch (conversionError: any) {
      console.error('Conversion error:', conversionError);
      return NextResponse.json(
        { success: false, error: conversionError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 