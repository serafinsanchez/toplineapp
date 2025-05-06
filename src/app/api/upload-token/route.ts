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
    
    // Log the data to help debug
    console.log('Signed URL data:', {
      url: data.signedUrl,
      token: data.token,
      path: filePath
    });
    
    // Instead of using signedUrl directly, we'll use a 2-step upload process
    // Step 1: Get an admin-authorized upload path using the service role
    const uploadPath = filePath;
    
    // Return the information needed for direct upload
    return NextResponse.json({
      success: true,
      uploadId,
      path: filePath,
      directUpload: true,
      method: 'PUT', // Supabase client uses PUT for direct uploads
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