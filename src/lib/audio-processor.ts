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
const WORKFLOW = 'music-ai/get-acapella';

// Temporary directory for uploaded files
const TEMP_DIR = path.join(process.cwd(), 'tmp');
const RESULTS_DIR = path.join(TEMP_DIR, 'results');

// Ensure directories exist
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
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
async function uploadFile(filePath: string): Promise<string> {
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
async function createJob(inputUrl: string): Promise<string> {
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
async function checkJobStatus(jobId: string): Promise<MusicAiJobResponse> {
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
  
  let job: MusicAiJobResponse;
  let attempts = 0;
  const maxAttempts = 60; // 10 minutes with 10-second intervals
  
  while (attempts < maxAttempts) {
    job = await checkJobStatus(jobId);
    
    if (job.status === 'SUCCEEDED') {
      console.log('✅ Job completed successfully!');
      return job;
    } else if (job.status === 'FAILED') {
      console.error('❌ Job failed with the following details:');
      console.error(JSON.stringify(job, null, 2));
      throw new Error('Job failed to process');
    }
    
    console.log(`Job status: ${job.status}. Waiting 10 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    attempts++;
  }
  
  throw new Error('Job timed out');
}

/**
 * Download the stems from a completed job
 */
async function downloadStems(job: MusicAiJobResponse, outputDir: string): Promise<MusicAiStemResult> {
  console.log(`Downloading stems to ${outputDir}...`);
  
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
  
  // Download each stem
  for (const [stemName, stemUrl] of Object.entries(result)) {
    // Map the API's stem names to our desired output file names
    let outputFileName = stemName;
    if (stemName === 'vocals') {
      outputFileName = 'acapella';
    } else if (stemName === 'accompaniment') {
      outputFileName = 'instrumental';
    }
    
    const outputPath = path.join(outputDir, `${outputFileName}.wav`);
    console.log(`Downloading ${stemName} to ${outputPath}...`);
    
    const response = await axios({
      method: 'get',
      url: stemUrl,
      responseType: 'arraybuffer'
    });
    
    await writeFileAsync(outputPath, response.data);
    
    if (stemName === 'vocals') {
      acapellaPath = outputPath;
    } else if (stemName === 'accompaniment') {
      instrumentalPath = outputPath;
    }
  }
  
  // We no longer save the job-info.json file
  
  if (!acapellaPath || !instrumentalPath) {
    throw new Error('Failed to download all required stems');
  }
  
  return { acapellaPath, instrumentalPath };
}

/**
 * Clean up a job after processing
 */
async function cleanupJob(jobId: string): Promise<void> {
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
async function deductCredit(userId: string): Promise<void> {
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