import { extractAcapella, downloadFileFromUrl, cleanupFiles } from '@/lib/acapella-extractor';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Test audio URL - replace with your test audio file URL
const TEST_AUDIO_URL = 'YOUR_TEST_AUDIO_URL';

async function runTest() {
  console.log('🔍 Starting acapella extraction test with get-acapella workflow');
  console.log('---------------------------------------------------------');
  
  if (!TEST_AUDIO_URL || TEST_AUDIO_URL === 'YOUR_TEST_AUDIO_URL') {
    console.error('❌ Please set a valid TEST_AUDIO_URL in the test script');
    process.exit(1);
  }
  
  let tempFilePath: string | null = null;
  let acapellaPath: string | null = null;
  
  try {
    // Download test file
    console.log(`Downloading test file from: ${TEST_AUDIO_URL}`);
    tempFilePath = await downloadFileFromUrl(TEST_AUDIO_URL);
    console.log(`✅ Downloaded test file to: ${tempFilePath}`);
    
    // Extract acapella
    console.log('Starting acapella extraction process...');
    console.time('Extraction Time');
    acapellaPath = await extractAcapella(tempFilePath, null); // Pass null for userId to skip credit deduction
    console.timeEnd('Extraction Time');
    
    console.log(`✅ Acapella extraction completed successfully!`);
    console.log(`Acapella saved to: ${acapellaPath}`);
    
    // In a real test, you might want to play the acapella or upload it somewhere
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    // Clean up temporary files
    const filesToCleanup = [];
    if (tempFilePath) filesToCleanup.push(tempFilePath);
    // We don't clean up the acapella file as you may want to examine it
    
    if (filesToCleanup.length > 0) {
      await cleanupFiles(filesToCleanup);
      console.log('🧹 Cleaned up temporary files');
    }
  }
}

// Run the test
runTest().catch(error => {
  console.error('Unhandled error in test:', error);
  process.exit(1);
}); 