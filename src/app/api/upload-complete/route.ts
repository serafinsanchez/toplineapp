import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    const { filename, uploadId } = body;
    
    if (!uploadId) {
      return NextResponse.json(
        { success: false, error: 'Upload ID is required' },
        { status: 400 }
      );
    }
    
    // Reconstruct the file path based on the upload ID and filename
    const uniqueFileName = `${uploadId}_${filename.replace(/\s+/g, '_')}`;
    
    // Look for the file in the uploads directory
    const supabaseAdmin = createServiceRoleClient();
    
    // List files in the uploads directory with the upload ID
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('audio-uploads')
      .list('uploads', {
        limit: 10,
        search: uploadId
      });
      
    if (listError) {
      console.error('Error listing files:', listError);
      return NextResponse.json(
        { success: false, error: 'Failed to find uploaded file' },
        { status: 500 }
      );
    }
    
    // Find the file that matches the upload ID
    const uploadedFile = files.find(file => file.name.includes(uploadId));
    
    if (!uploadedFile) {
      return NextResponse.json(
        { success: false, error: 'Uploaded file not found' },
        { status: 404 }
      );
    }
    
    // Get the full file path
    const filePath = `uploads/${uploadedFile.name}`;
    
    // Get the public URL for the file
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('audio-uploads')
      .getPublicUrl(filePath);
      
    // Return the file information
    return NextResponse.json({
      success: true,
      filePath,
      url: publicUrl,
      bucketIsPublic: true
    });
  } catch (error) {
    console.error('Error completing upload:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
} 