import { createClient } from '@supabase/supabase-js';

// Create a public Supabase client
// This is safe to expose in browser code
const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * Uploads a file directly to Supabase in chunks
 * This avoids Vercel's 4.5MB payload limit by uploading directly from the browser
 */
export async function uploadLargeFileToSupabase(
  file: File,
  bucket: string = 'audio-uploads',
  folder: string = 'uploads',
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; error?: any; filePath?: string; url?: string }> {
  try {
    const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const fileName = `${fileId}_${file.name.replace(/\s+/g, '_')}`;
    const filePath = `${folder}/${fileName}`;
    
    if (!onProgress) {
      onProgress = (p) => console.log(`Upload progress: ${Math.round(p * 100)}%`);
    }
    
    // Upload the file directly to Supabase
    const { data, error } = await supabasePublic.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
        duplex: 'half',
        // Add onUploadProgress callback for progress tracking
        onUploadProgress: (event) => {
          if (event.total) {
            const progress = event.loaded / event.total;
            onProgress?.(progress);
          }
        }
      });
    
    if (error) {
      console.error('Error uploading to Supabase:', error);
      throw error;
    }
    
    // Get the public URL
    const { data: publicUrlData } = supabasePublic.storage
      .from(bucket)
      .getPublicUrl(filePath);
      
    return {
      success: true,
      filePath,
      url: publicUrlData.publicUrl
    };
  } catch (error) {
    console.error('Error in large file upload:', error);
    return { success: false, error };
  }
} 