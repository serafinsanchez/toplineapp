#!/usr/bin/env node

/**
 * Music AI Acapella Extraction Script
 * 
 * This script extracts vocals and accompaniment stems from an audio file
 * using the Music AI API with the music-ai/stems-vocals-accompaniment workflow.
 * Results are saved in a job-specific folder within the ./results directory.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
require('dotenv').config(); // Re-enable dotenv dependency

// Configuration
const API_KEY = process.env.MOISES_DEVELOPER_APIKEY; // Use environment variable
const API_BASE_URL = 'https://api.music.ai/api';
const WORKFLOW = 'music-ai/stems-vocals-accompaniment';
const RESULTS_DIR = './results';

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  console.log(`Created results directory: ${RESULTS_DIR}`);
}

// Validate API key
if (!API_KEY) {
  console.error('Error: API key not set');
  console.error('Please set the MOISES_DEVELOPER_APIKEY environment variable in your .env file');
  process.exit(1);
}

/**
 * Upload a file to the Music AI temporary storage
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<string>} - Download URL for the uploaded file
 */
async function uploadFile(filePath) {
  console.log(`Uploading ${filePath}...`);
  
  try {
    // Get upload URL
    const uploadResponse = await axios.get(`${API_BASE_URL}/upload`, {
      headers: { 'Authorization': API_KEY }
    });
    
    const { uploadUrl, downloadUrl } = uploadResponse.data;
    
    // Upload the file
    const fileContent = fs.readFileSync(filePath);
    
    // Determine content type based on file extension
    const fileExt = path.extname(filePath).toLowerCase();
    let contentType = 'audio/mpeg'; // Default
    
    if (fileExt === '.wav') contentType = 'audio/wav';
    else if (fileExt === '.ogg') contentType = 'audio/ogg';
    else if (fileExt === '.flac') contentType = 'audio/flac';
    else if (fileExt === '.m4a') contentType = 'audio/m4a';
    
    await axios.put(uploadUrl, fileContent, {
      headers: { 'Content-Type': contentType }
    });
    
    console.log('✅ File uploaded successfully');
    return downloadUrl;
  } catch (error) {
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
 * @param {string} inputUrl - URL of the uploaded audio file
 * @returns {Promise<string>} - Job ID
 */
async function createJob(inputUrl) {
  console.log(`Creating job with workflow: ${WORKFLOW}...`);
  
  try {
    const jobResponse = await axios.post(`${API_BASE_URL}/job`, {
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
  } catch (error) {
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
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} - Job data
 */
async function checkJobStatus(jobId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/job/${jobId}`, {
      headers: { 'Authorization': API_KEY }
    });
    
    return response.data;
  } catch (error) {
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
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} - Completed job data
 */
async function waitForJobCompletion(jobId) {
  console.log('Waiting for job to complete...');
  
  let job;
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
 * @param {Object} job - Job data
 * @param {string} outputDir - Directory to save the stems
 * @returns {Promise<string[]>} - Paths to the downloaded files
 */
async function downloadStems(job, outputDir) {
  console.log(`Downloading stems to ${outputDir}...`);
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }
  
  const downloads = [];
  const result = job.result;
  
  // Download each stem
  for (const [stemName, stemUrl] of Object.entries(result)) {
    const outputPath = path.join(outputDir, `${stemName}.wav`);
    console.log(`Downloading ${stemName} to ${outputPath}...`);
    
    const response = await axios({
      method: 'get',
      url: stemUrl,
      responseType: 'arraybuffer'
    });
    
    await writeFile(outputPath, response.data);
    downloads.push(outputPath);
  }
  
  // Save job result metadata
  const metadataPath = path.join(outputDir, 'job-info.json');
  await writeFile(metadataPath, JSON.stringify(job, null, 2));
  
  return downloads;
}

/**
 * Clean up a job after processing
 * @param {string} jobId - Job ID
 */
async function cleanupJob(jobId) {
  console.log(`Cleaning up job ${jobId}...`);
  
  try {
    await axios.delete(`${API_BASE_URL}/job/${jobId}`, {
      headers: { 'Authorization': API_KEY }
    });
    
    console.log('✅ Job deleted successfully');
  } catch (error) {
    console.warn(`⚠️ Warning: Failed to delete job ${jobId}`);
    console.warn(error.message);
    // Continue execution even if cleanup fails
  }
}

/**
 * Main function to extract vocals and accompaniment
 * @param {string} inputFile - Path to the audio file
 */
async function extractAcapella(inputFile) {
  try {
    // 1. Upload the file
    const downloadUrl = await uploadFile(inputFile);
    
    // 2. Create a job
    const jobId = await createJob(downloadUrl);
    console.log(`Job created with ID: ${jobId}`);
    
    // 3. Create job-specific output directory
    const outputDir = path.join(RESULTS_DIR, jobId);
    
    // 4. Wait for job completion
    const job = await waitForJobCompletion(jobId);
    
    // 5. Download the stems
    const downloadedFiles = await downloadStems(job, outputDir);
    console.log(`Downloaded ${downloadedFiles.length} files`);
    
    // 6. Cleanup
    await cleanupJob(jobId);
    
    console.log('✅ Processing completed successfully!');
    console.log(`Results saved to: ${outputDir}`);
    
    return {
      success: true,
      outputDir,
      files: downloadedFiles
    };
  } catch (error) {
    console.error('❌ Error during processing:');
    console.error(error.message);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Print usage information
 */
function printUsage() {
  console.log('Usage: node acapella.js <audio-file>');
  console.log('');
  console.log('Example:');
  console.log('  node acapella.js song.mp3');
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }
  
  const inputFile = args[0];
  
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File not found: ${inputFile}`);
    process.exit(1);
  }
  
  extractAcapella(inputFile)
    .then(result => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

// Export functions for use in other modules
module.exports = {
  extractAcapella,
  uploadFile,
  createJob,
  checkJobStatus,
  waitForJobCompletion,
  downloadStems,
  cleanupJob
};