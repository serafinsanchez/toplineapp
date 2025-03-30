# Acapella Extractor

This module provides functionality to extract acapella tracks (vocals) from music using the Music.ai API with the `get-acapella` workflow.

## Overview

The `acapella-extractor.ts` module is designed to process audio files by:
1. Uploading the audio file to Music.ai
2. Creating a processing job with the `get-acapella` workflow
3. Monitoring the job until completion
4. Downloading the resulting acapella track
5. Optionally deducting a credit from the user's account

## Usage

### Basic usage in API routes

```typescript
import { extractAcapella } from '@/lib/acapella-extractor';

// In an API route handler
export default async function handler(req, res) {
  try {
    // Get the file path (from a file upload or URL)
    const filePath = '...'; // Path to audio file
    const userId = req.user?.id || null; // Optional user ID for credit deduction
    
    // Extract the acapella
    const acapellaPath = await extractAcapella(filePath, userId);
    
    // Return the acapella path or stream the file
    res.status(200).json({ success: true, acapellaPath });
  } catch (error) {
    console.error('Error extracting acapella:', error);
    res.status(500).json({ error: 'Failed to extract acapella' });
  }
}
```

### Processing files from URLs

If you have a URL to an audio file (e.g., from Supabase storage), you can use:

```typescript
import { downloadFileFromUrl, extractAcapella } from '@/lib/acapella-extractor';

// Download the file first
const filePath = await downloadFileFromUrl(audioFileUrl);

// Then extract the acapella
const acapellaPath = await extractAcapella(filePath, userId);
```

## Testing

A test script is provided to verify the acapella extraction functionality:

```bash
# Run with a test audio URL
node scripts/test-acapella-extraction.js https://example.com/path/to/audio.mp3
```

## API Reference

### Main Functions

#### `extractAcapella(filePath: string, userId: string | null): Promise<string>`
Processes an audio file to extract the acapella track.
- `filePath`: Path to the audio file
- `userId`: Optional user ID for credit deduction
- Returns: Path to the extracted acapella file

#### `downloadFileFromUrl(fileUrl: string): Promise<string>`
Downloads a file from a URL and saves it to the temp directory.
- `fileUrl`: URL of the file to download
- Returns: Path to the downloaded file

### Helper Functions

- `saveUploadedFile(file: Buffer, filename: string): Promise<string>`
- `uploadFile(filePath: string): Promise<string>`
- `createAcapellaJob(inputUrl: string): Promise<string>`
- `checkJobStatus(jobId: string): Promise<MusicAiJobResponse>`
- `downloadAcapella(job: MusicAiJobResponse, outputDir: string): Promise<string>`
- `cleanupJob(jobId: string): Promise<void>`
- `cleanupFiles(filePaths: string[]): Promise<void>`
- `deductCredit(userId: string): Promise<void>`

## Configuration

The module uses the following configuration:
- `API_KEY`: From environment variable `MOISES_DEVELOPER_APIKEY`
- `API_BASE_URL`: The Music.ai API base URL
- `WORKFLOW`: Set to `get-acapella`

Temporary files are stored in:
- `/tmp` in production (Vercel serverless environment)
- `./tmp` locally 