import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { saveUploadedFile } from '@/lib/audio-processor';

// Supported file formats
const SUPPORTED_FORMATS = ['.mp3', '.wav', '.aiff'];
// Maximum file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Check if the request is multipart/form-data
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Request must be multipart/form-data' },
        { status: 400 }
      );
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds the limit (50MB)' },
        { status: 400 }
      );
    }

    // Validate file format
    const fileName = file.name.toLowerCase();
    const isValidFormat = SUPPORTED_FORMATS.some(format => 
      fileName.endsWith(format)
    );

    if (!isValidFormat) {
      return NextResponse.json(
        { error: 'Unsupported file format. Please upload MP3, WAV, or AIFF files.' },
        { status: 400 }
      );
    }

    // Convert the file to a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save the file to the temp directory
    const filePath = await saveUploadedFile(buffer, file.name);

    // Return the file path for further processing
    return NextResponse.json({ 
      success: true, 
      filePath,
      fileName: file.name,
      fileSize: file.size
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// Set the maximum request body size
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}; 