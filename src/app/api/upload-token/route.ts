import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const filename = url.searchParams.get('filename');
    const fileType = url.searchParams.get('fileType');

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename parameter is required' },
        { status: 400 }
      );
    }

    // Generate a unique identifier for this upload
    const uploadId = uuidv4();
    const uniqueFileName = `${Date.now()}_${uploadId}_${filename.replace(/\s+/g, '_')}`;
    const filePath = `uploads/${uniqueFileName}`;

    // Use service role client to generate a presigned URL
    const supabaseAdmin = createServiceRoleClient();
    
    // Create a presigned URL for uploading directly to Supabase
    const { data, error } = await supabaseAdmin.storage.from('audio-uploads')
      .createSignedUploadUrl(filePath);
      
    if (error) {
      console.error('Error creating signed upload URL:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to generate upload URL' },
        { status: 500 }
      );
    }
    
    // Return the presigned URL and other metadata
    return NextResponse.json({
      success: true,
      uploadUrl: data.signedUrl,
      path: filePath,
      uploadId,
      // Include Supabase's fields if available
      ...(data.token && { token: data.token }),
      // Include any extra information needed for the upload
      fileType,
      filename: uniqueFileName
    });
  } catch (error) {
    console.error('Error generating upload token:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
} 