import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { extractAcapella, downloadFileFromUrl } from '@/lib/acapella-extractor';

// Disable body parsing, we'll handle the form with formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Initialize auth
    const supabase = createServerSupabaseClient({ req, res });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    // Get user ID or null if not authenticated
    const userId = session?.user?.id || null;
    
    // Parse the incoming form data
    const form = formidable({ keepExtensions: true });
    
    const parseForm = () => {
      return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          resolve({ fields, files });
        });
      });
    };
    
    const { fields, files } = await parseForm();
    
    // Track files to cleanup
    const filesToCleanup: string[] = [];
    
    let inputFilePath = '';
    
    // Check if we have a file upload
    const uploadedFile = files.file as formidable.File;
    if (uploadedFile && uploadedFile.filepath) {
      // Use the uploaded file
      inputFilePath = uploadedFile.filepath;
      // Don't add to cleanup as formidable handles this
    } 
    // Or check if we have a file URL
    else if (fields.url && typeof fields.url === 'string') {
      // Download the file from the URL
      inputFilePath = await downloadFileFromUrl(fields.url);
      filesToCleanup.push(inputFilePath);
    } else {
      return res.status(400).json({ error: 'No file or URL provided' });
    }
    
    console.log(`Processing acapella extraction for ${userId || 'anonymous user'}`);
    
    // Process the file
    const acapellaPath = await extractAcapella(inputFilePath, userId);
    
    // Get the acapella file as base64
    const acapellaFile = fs.readFileSync(acapellaPath);
    const acapellaBase64 = acapellaFile.toString('base64');
    
    // Return the result
    return res.status(200).json({
      success: true,
      acapella: {
        name: 'acapella.wav',
        type: 'audio/wav',
        data: acapellaBase64
      }
    });
    
  } catch (error: any) {
    console.error('Error processing acapella extraction:', error);
    
    // Return appropriate error responses
    if (error.message === 'Insufficient credits') {
      return res.status(402).json({ error: 'Insufficient credits' });
    }
    
    return res.status(500).json({ 
      error: 'Failed to extract acapella',
      details: error.message
    });
  }
} 