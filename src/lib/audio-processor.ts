import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import { handleCreditTransaction, supabase, createServiceRoleClient } from '@/lib/supabase';
import { 
  MusicAiUploadResponse, 
  MusicAiJobResponse, 
  MusicAiStemResult 
} from '../types';

// Promisify fs functions
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);

// Configuration
const API_KEY = process.env.MOISES_DEVELOPER_APIKEY || '2038d552-4626-45f9-8ce7-11f04e3aad08';
const API_BASE_URL = 'https://api.music.ai/api';

// Update to use the new workflow
const WORKFLOW = 'get-acapella'; // Updated from 'music-ai/stems-vocals-accompaniment'

// Temporary directory for uploaded files - use /tmp for Vercel serverless environment
const TEMP_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'tmp');
const RESULTS_DIR = path.join(TEMP_DIR, 'results');

// Ensure directories exist
if (!fs.existsSync(TEMP_DIR)) {
  try {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    console.log(`Created temp directory at ${TEMP_DIR}`);
  } catch (error) {
    console.error(`Failed to create temp directory at ${TEMP_DIR}:`, error);
  }
}

if (!fs.existsSync(RESULTS_DIR)) {
  try {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    console.log(`Created results directory at ${RESULTS_DIR}`);
  } catch (error) {
    console.error(`Failed to create results directory at ${RESULTS_DIR}:`, error);
  }
}

// Validate API key
if (!API_KEY) {
  console.error('Error: MOISES_DEVELOPER_APIKEY not set in environment variables');
}

/**
 * Save an uploaded file to the temp directory
 */
export async function saveUploadedFile(file: Buffer, filename: string): Promise<string> {
  const fileId = uuidv4();
  const fileExt = path.extname(filename);
  const safeFilename = `${fileId}${fileExt}`;
  const filePath = path.join(TEMP_DIR, safeFilename);
  
  await writeFileAsync(filePath, file);
  
  return filePath;
}

/**
 * Upload a file to the Music AI temporary storage
 */
export async function uploadFile(filePath: string): Promise<string> {
  console.log(`Uploading ${filePath}...`);
  
  try {
    // Get upload URL
    const uploadResponse = await axios.get<MusicAiUploadResponse>(`${API_BASE_URL}/upload`, {
      headers: { 'Authorization': API_KEY }
    });
    
    const { uploadUrl, downloadUrl } = uploadResponse.data;
    
    // Upload the file
    const fileContent = await readFileAsync(filePath);
    
    // Determine content type based on file extension
    const fileExt = path.extname(filePath).toLowerCase();
    let contentType = 'audio/mpeg'; // Default
    
    if (fileExt === '.wav') contentType = 'audio/wav';
    else if (fileExt === '.ogg') contentType = 'audio/ogg';
    else if (fileExt === '.flac') contentType = 'audio/flac';
    else if (fileExt === '.m4a') contentType = 'audio/m4a';
    else if (fileExt === '.aiff' || fileExt === '.aif') contentType = 'audio/aiff';
    
    await axios.put(uploadUrl, fileContent, {
      headers: { 'Content-Type': contentType }
    });
    
    console.log('✅ File uploaded successfully');
    return downloadUrl;
  } catch (error: any) {
    console.error('❌ Error during file upload:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
    throw new Error('File upload failed');
  }
}

/**
 * Create a new job to process the audio file
 */
export async function createJob(inputUrl: string): Promise<string> {
  console.log(`Creating job with workflow: ${WORKFLOW}...`);
  console.log(`Input URL: ${inputUrl.substring(0, 100)}...`);
  
  // Validate inputUrl
  if (!inputUrl || typeof inputUrl !== 'string') {
    throw new Error('Invalid input URL provided');
  }
  
  try {
    // Remove the health check as it's returning 404 errors
    // Music.ai API doesn't seem to have a /health endpoint
    
    // Create the actual job
    const jobName = `Acapella Extraction ${new Date().toISOString()}`;
    console.log(`Creating job "${jobName}" with input URL`);
    
    const jobResponse = await axios.post<MusicAiJobResponse>(`${API_BASE_URL}/job`, {
      name: jobName,
      workflow: WORKFLOW,
      params: { inputUrl }
    }, {
      headers: {
        'Authorization': API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30-second timeout
    });
    
    if (!jobResponse.data || !jobResponse.data.id) {
      throw new Error('Job creation response did not include a job ID');
    }
    
    console.log(`Job created successfully with ID: ${jobResponse.data.id}`);
    return jobResponse.data.id;
  } catch (error: any) {
    console.error('❌ Error creating job:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
      throw new Error(`Failed to create job: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw new Error('Failed to create job: No response from server');
    } else {
      console.error(error.message);
      throw new Error(`Failed to create job: ${error.message}`);
    }
  }
}

/**
 * Check the status of a job
 */
export async function checkJobStatus(jobId: string): Promise<MusicAiJobResponse> {
  try {
    const response = await axios.get<MusicAiJobResponse>(`${API_BASE_URL}/job/${jobId}`, {
      headers: { 'Authorization': API_KEY }
    });
    
    return response.data;
  } catch (error: any) {
    console.error(`❌ Error checking job status for job ${jobId}:`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
    throw new Error('Failed to check job status');
  }
}

/**
 * Wait for a job to complete
 */
async function waitForJobCompletion(jobId: string): Promise<MusicAiJobResponse> {
  console.log('Waiting for job to complete...');
  
  let job: MusicAiJobResponse | null = null;
  let attempts = 0;
  // Even more aggressive polling for better performance in serverless
  const maxAttempts = 60; // 5 minutes with 5-second intervals
  const checkInterval = 5000; // 5 seconds between checks
  
  try {
    while (attempts < maxAttempts) {
      try {
        job = await checkJobStatus(jobId);
        
        if (!job) {
          console.warn(`⚠️ Received null job object on attempt ${attempts+1}`);
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          attempts++;
          continue;
        }
        
        // Handle job status string safely
        const status = job.status ? job.status.toString() : 'UNKNOWN';
        
        if (status === 'SUCCEEDED') {
          console.log('✅ Job completed successfully!');
          return job;
        } else if (status === 'FAILED') {
          console.error('❌ Job failed with the following details:');
          console.error(JSON.stringify(job, null, 2));
          throw new Error('Job failed to process');
        } else if (status === 'PROCESSING' || status === 'CREATED') {
          // Job is still in progress - expected states
          console.log(`Job status: ${status}. Checking again in ${checkInterval/1000} seconds... (attempt ${attempts+1}/${maxAttempts})`);
        } else {
          // Unexpected status - log but continue waiting
          console.warn(`⚠️ Unexpected job status: ${status}. Continuing to wait...`);
        }
        
        // Wait between checks
        await new Promise(resolve => setTimeout(resolve, checkInterval)); 
        attempts++;
      } catch (error: any) {
        console.error(`Error checking job status (attempt ${attempts+1}/${maxAttempts}):`, error.message);
        
        // If we get an error, wait a bit longer before retrying (backoff)
        await new Promise(resolve => setTimeout(resolve, checkInterval * 2));
        attempts++;
        
        // If we've already made several attempts, still fail gracefully
        if (attempts >= Math.floor(maxAttempts / 2)) {
          throw new Error(`Job status check failed too many times: ${error.message}`);
        }
      }
    }
  } catch (error: any) {
    console.error('Error in waitForJobCompletion:', error);
    throw new Error(`Job monitoring failed: ${error.message}`);
  }
  
  throw new Error('Job processing timed out. Please try again with a smaller file.');
}

/**
 * Download the stems from a completed job
 */
export async function downloadStems(job: MusicAiJobResponse, outputDir: string): Promise<MusicAiStemResult> {
  console.log(`Downloading stems to ${outputDir}...`);
  
  // Extra defensive coding for production
  if (!job) {
    throw new Error('Job object is null or undefined');
  }
  
  if (!job.result) {
    throw new Error('Job result is missing');
  }
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    await mkdirAsync(outputDir, { recursive: true });
  }
  
  const result = job.result;
  let acapellaPath = '';
  let instrumentalPath = '';
  
  // Ensure result is a valid object that can be iterated
  if (typeof result !== 'object' || result === null) {
    console.error('Invalid job result format:', typeof result, result);
    throw new Error(`Invalid job result format: got ${typeof result} instead of object`);
  }
  
  // Extreme safety - stringify and then re-parse to ensure it's a clean object
  let safeResult: Record<string, string>;
  try {
    // Parsing and stringifying can help normalize problematic objects in production
    const resultStr = JSON.stringify(result);
    safeResult = JSON.parse(resultStr);
    console.log('Job result keys:', Object.keys(safeResult));
  } catch (parseError: any) {
    console.error('Error normalizing result object:', parseError);
    throw new Error(`Failed to process job result: ${parseError.message}`);
  }
  
  // Download each stem - use try/catch for each stem to be more resilient
  try {
    // Safe way to iterate over entries with type checking
    const entries = Object.entries(safeResult);
    
    if (!entries || !entries.length) {
      throw new Error('No stems found in job result');
    }
    
    console.log(`Found ${entries.length} stems to download`);
    
    for (const [stemName, stemUrl] of entries) {
      // Ensure stemName and stemUrl are strings
      if (typeof stemName !== 'string') {
        console.error(`Invalid stem name:`, stemName);
        continue;
      }
      
      // Ensure stemUrl is a string
      if (typeof stemUrl !== 'string') {
        console.error(`Invalid stem URL for ${stemName}:`, stemUrl);
        continue; // Skip this stem but try to process others
      }
      
      // Map the API's stem names to our desired output file names
      let outputFileName = stemName;
      
      // Handle both new ('acapella'/'instrumental') and old ('vocals'/'accompaniment') stem names
      if (stemName === 'vocals' || stemName === 'acapella') {
        outputFileName = 'acapella';
      } else if (stemName === 'accompaniment' || stemName === 'instrumental') {
        outputFileName = 'instrumental';
      }
      
      const outputPath = path.join(outputDir, `${outputFileName}.wav`);
      console.log(`Downloading ${stemName} to ${outputPath}...`);
      
      // Add extra try/catch for each individual download to make it more robust
      try {
        const response = await axios({
          method: 'get',
          url: stemUrl,
          responseType: 'arraybuffer',
          timeout: 60000 // Increase to 60 second timeout to prevent hanging requests
        });
        
        if (!response.data) {
          console.error(`No data received for stem ${stemName}`);
          continue;
        }
        
        await writeFileAsync(outputPath, response.data);
        console.log(`Successfully wrote ${outputPath}, size: ${response.data.length} bytes`);
        
        if (stemName === 'vocals' || stemName === 'acapella') {
          acapellaPath = outputPath;
        } else if (stemName === 'accompaniment' || stemName === 'instrumental') {
          instrumentalPath = outputPath;
        }
      } catch (downloadError: any) {
        console.error(`Error downloading stem ${stemName}:`, downloadError.message);
        // Continue to next stem instead of failing completely
      }
    }
  } catch (error: any) {
    console.error('Error during stem download:', error);
    throw new Error(`Failed to download stems: ${error.message}`);
  }
  
  // Check if we got all the required stems
  if (!acapellaPath || !instrumentalPath) {
    throw new Error('Failed to download all required stems. Please try again.');
  }
  
  return { acapellaPath, instrumentalPath };
}

/**
 * Clean up a job after processing
 */
export async function cleanupJob(jobId: string): Promise<void> {
  console.log(`Cleaning up job ${jobId}...`);
  
  try {
    await axios.delete(`${API_BASE_URL}/job/${jobId}`, {
      headers: { 'Authorization': API_KEY }
    });
    
    console.log('✅ Job deleted successfully');
  } catch (error: any) {
    console.warn(`⚠️ Warning: Failed to delete job ${jobId}`);
    console.warn(error.message);
    // Continue execution even if cleanup fails
  }
}

/**
 * Process an audio file to extract stems
 */
export async function processAudioFile(
  filePath: string,
  userId: string | null
): Promise<{ acapellaPath: string; instrumentalPath: string }> {
  try {
    // 1. Upload the file
    const downloadUrl = await uploadFile(filePath);
    
    // 2. Create a job
    const jobId = await createJob(downloadUrl);
    console.log(`Job created with ID: ${jobId}`);
    
    // 3. Create job-specific output directory
    const outputDir = path.join(RESULTS_DIR, jobId);
    
    // 4. Wait for job completion
    const job = await waitForJobCompletion(jobId);
    
    // 5. Download the stems
    const { acapellaPath, instrumentalPath } = await downloadStems(job, outputDir);
    
    // 6. Cleanup
    await cleanupJob(jobId);
    
    // 7. If user is logged in, deduct a credit
    if (userId) {
      await deductCredit(userId);
    }
    
    console.log('✅ Processing completed successfully!');
    console.log(`Results saved to: ${outputDir}`);
    
    return {
      acapellaPath,
      instrumentalPath,
    };
  } catch (error) {
    console.error('Error processing audio file:', error);
    throw error;
  }
}

/**
 * Deduct a credit from the user's account
 */
export async function deductCredit(userId: string): Promise<void> {
  try {
    // Use the service role client to bypass RLS
    const supabaseAdmin = createServiceRoleClient();
    
    // Get current credits
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('balance')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      throw error;
    }
    
    const currentCredits = data?.balance || 0;
    
    if (currentCredits < 1) {
      throw new Error('Insufficient credits');
    }
    
    // Update credits using handleCreditTransaction
    const result = await handleCreditTransaction(userId, 'use', 1);
    
    if (!result.success) {
      throw new Error('Failed to deduct credit');
    }
  } catch (error) {
    console.error('Error deducting credit:', error);
    throw error;
  }
}

/**
 * Clean up temporary files
 */
export async function cleanupFiles(filePaths: string[]): Promise<void> {
  try {
    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        await unlinkAsync(filePath);
      }
    }
  } catch (error) {
    console.error('Error cleaning up files:', error);
  }
}

/**
 * Download file from URL (for Supabase files) and save to temp directory
 */
export async function downloadFileFromUrl(fileUrl: string): Promise<string> {
  console.log(`Downloading file from URL: ${fileUrl}...`);
  
  try {
    let finalUrl = fileUrl;
    
    // Handle Supabase storage URLs
    if (fileUrl.includes('supabase.co/storage/v1/object/public')) {
      // This is a public Supabase URL
      console.log('Detected Supabase storage URL');
      
      // For Supabase URLs, we may need to get a signed URL using the service role client
      // If the URL already contains a token, we'll use it directly
      if (!fileUrl.includes('token=')) {
        try {
          console.log('Getting signed URL for Supabase storage object');
          const supabaseAdmin = createServiceRoleClient();
          
          // Extract bucket and path from URL
          // Format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
          const urlParts = fileUrl.split('/public/');
          if (urlParts.length > 1) {
            const pathParts = urlParts[1].split('/');
            const bucket = pathParts[0];
            const path = pathParts.slice(1).join('/');
            
            console.log(`Extracted bucket: ${bucket}, path: ${path}`);
            
            // Get signed URL that works for 60 seconds
            const { data, error } = await supabaseAdmin
              .storage
              .from(bucket)
              .createSignedUrl(path, 60);
            
            if (error) {
              console.error('Error creating signed URL:', error);
            } else if (data?.signedUrl) {
              finalUrl = data.signedUrl;
              console.log('Successfully created signed URL');
            }
          }
        } catch (signedUrlError) {
          console.error('Error getting signed URL:', signedUrlError);
          // Continue with the original URL if we can't get a signed URL
        }
      }
    }
    
    // Use axios for better logging and error handling
    console.log(`Downloading from: ${finalUrl.split('?')[0]}...`);
    const response = await axios({
      method: 'get',
      url: finalUrl,
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Topline-Server/1.0',
        'X-Topline-Client': 'Server'
      }
    });
    
    if (!response.data || response.data.byteLength === 0) {
      throw new Error('Received empty file from server');
    }
    
    // Generate a unique filename
    const fileId = uuidv4();
    let fileExt = '.mp3'; // Default to mp3, but we should try to detect from URL or Content-Type
    
    // Try to detect extension from content-type
    const contentType = response.headers['content-type'];
    if (contentType) {
      if (contentType.includes('wav')) {
        fileExt = '.wav';
      } else if (contentType.includes('aiff')) {
        fileExt = '.aiff';
      }
    }
    
    // Try to detect extension from URL
    const urlParts = fileUrl.split('?')[0].split('.');
    if (urlParts.length > 1) {
      const extension = `.${urlParts[urlParts.length - 1].toLowerCase()}`;
      if (['.mp3', '.wav', '.aiff', '.m4a', '.ogg', '.flac'].includes(extension)) {
        fileExt = extension;
      }
    }
    
    const safeFilename = `${fileId}${fileExt}`;
    const filePath = path.join(TEMP_DIR, safeFilename);
    
    await writeFileAsync(filePath, Buffer.from(response.data));
    
    const stats = fs.statSync(filePath);
    console.log(`File downloaded and saved to ${filePath} (size: ${Math.round(stats.size / 1024)} KB)`);
    return filePath;
  } catch (error: any) {
    console.error('Error downloading file from URL:', error);
    throw new Error(`Failed to download file from URL: ${error.message || 'Unknown error'}`);
  }
} 