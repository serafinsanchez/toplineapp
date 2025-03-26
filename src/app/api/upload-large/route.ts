import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Maximum file size - 25MB should be enough for audio files
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Configure larger limit at the route level
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Get form data with the file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }
    
    // Validate file type
    const validTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/aiff", "audio/x-aiff"];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isValidExtension = ["mp3", "wav", "aiff"].includes(fileExtension || "");
    
    if (!validTypes.includes(file.type) && !isValidExtension) {
      return NextResponse.json(
        { success: false, error: `File type '${file.type}' not supported` },
        { status: 400 }
      );
    }
    
    // Read the file content
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    
    // Generate a unique filename
    const uniqueFileName = `${Date.now()}_${uuidv4()}_${file.name.replace(/\s+/g, '_')}`;
    const filePath = `uploads/${uniqueFileName}`;
    
    // Use service role client to bypass RLS policies
    const supabaseAdmin = createServiceRoleClient();
    
    try {
      // First, check that the bucket has proper CORS settings
      // This is a one-time operation we're doing for diagnostic purposes
      try {
        const { data: bucketData, error: bucketError } = await supabaseAdmin
          .storage
          .getBucket('audio-uploads');
          
        if (!bucketError) {
          console.log('Bucket settings:', bucketData?.public ?? 'Not public');
        }
      } catch (bucketCheckError) {
        // Ignore errors, this is just for diagnostic
        console.log('Unable to check bucket settings:', bucketCheckError);
      }
      
      // Upload file to Supabase storage with public access
      const { data, error } = await supabaseAdmin.storage
        .from('audio-uploads')
        .upload(filePath, fileBuffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Error uploading file to Supabase:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to upload file' },
          { status: 500 }
        );
      }
      
      // Now, explicitly make the file public by setting appropriate bucket and file policies
      try {
        // First make sure the bucket is set to public
        try {
          await supabaseAdmin.storage.updateBucket('audio-uploads', {
            public: true,
            allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/aiff', 'audio/x-aiff'],
            fileSizeLimit: MAX_FILE_SIZE
          });
        } catch (bucketError) {
          console.warn('Note: Could not update bucket settings (may need admin permission):', bucketError);
          // Continue anyway as we may not need to update the bucket
        }
        
        // Get public URL for the file
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('audio-uploads')
          .getPublicUrl(filePath);
          
        // Verify the URL is working by making a server-side request
        try {
          // We'll use the Node fetch API to check if the file is accessible
          const testRequest = await fetch(publicUrl, { method: 'HEAD' });
          if (!testRequest.ok) {
            console.warn(`Warning: File URL is not accessible: ${testRequest.status} ${testRequest.statusText}`);
            // We'll continue anyway as the URL might work from the server during processing
          } else {
            console.log('File URL is publicly accessible');
          }
        } catch (fetchError) {
          console.warn('Warning: Could not verify file URL:', fetchError);
          // Continue anyway as the URL might still work from the server
        }
        
        console.log(`File uploaded successfully: ${filePath}`);
        console.log(`Public URL: ${publicUrl}`);
        
        return NextResponse.json({
          success: true,
          filePath: filePath,
          url: publicUrl,
          bucketIsPublic: true
        });
      } catch (accessError) {
        console.warn('Error updating file permissions:', accessError);
        
        // Still return success but with a warning flag
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('audio-uploads')
          .getPublicUrl(filePath);
          
        return NextResponse.json({
          success: true,
          filePath: filePath,
          url: publicUrl,
          warningFlag: true,
          message: 'File uploaded but public access could not be verified'
        });
      }
    } catch (uploadError) {
      console.error('Fatal error during upload:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Internal server error during upload' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 