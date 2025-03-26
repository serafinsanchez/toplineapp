import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    const { filePath } = body;
    
    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'File path is required' },
        { status: 400 }
      );
    }
    
    // Verify the file exists in storage
    const supabaseAdmin = createServiceRoleClient();
    
    // Check if the file exists
    const { data, error } = await supabaseAdmin.storage
      .from('audio-uploads')
      .download(filePath);
      
    if (error) {
      console.error('Error verifying file:', error);
      return NextResponse.json(
        { success: false, error: 'File not found or access denied' },
        { status: 404 }
      );
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('audio-uploads')
      .getPublicUrl(filePath);
      
    // Return verification status
    return NextResponse.json({
      success: true,
      verified: true,
      filePath,
      url: publicUrl
    });
  } catch (error: any) {
    console.error('Error verifying file:', error);
    return NextResponse.json(
      { success: false, error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
} 