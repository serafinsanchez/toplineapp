import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import { handleCreditTransaction, supabase } from './supabase';
import { 
  MusicAiUploadResponse, 
  MusicAiJobResponse, 
  MusicAiStemResult 
} from '../types';
import { createServiceRoleClient } from './supabase';

// Promisify fs functions
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);

// Configuration
const API_KEY = process.env.MOISES_DEVELOPER_APIKEY || '2038d552-4626-45f9-8ce7-11f04e3aad08';
const API_BASE_URL = 'https://api.music.ai/api';
const WORKFLOW = 'music-ai/stems-vocals-accompaniment';

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
  
  try {
    const jobResponse = await axios.post<MusicAiJobResponse>(`${API_BASE_URL}/job`, {
      name: `Acapella Extraction ${new Date().toISOString()}`,
      workflow: WORKFLOW,
      params: { inputUrl }
    }, {
      headers: {
        'Authorization': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    return jobResponse.data.id;
  } catch (error: any) {
    console.error('❌ Error creating job:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
    throw new Error('Failed to create job');
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
      if (stemName === 'vocals') {
        outputFileName = 'acapella';
      } else if (stemName === 'accompaniment') {
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
        
        if (stemName === 'vocals') {
          acapellaPath = outputPath;
        } else if (stemName === 'accompaniment') {
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