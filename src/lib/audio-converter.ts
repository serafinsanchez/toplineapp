import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

// Extend FfmpegCommand to include progress event
declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    on(event: 'progress', callback: (progress: ConversionProgress) => void): FfmpegCommand;
  }
}

const fsAccess = promisify(fs.access);

interface ConversionProgress {
  percent: number;
  targetSize: number;
  currentTime: number;
  currentKbps: number;
  currentFps: number;
  fps: number;
  quality: number;
  frames: number;
  timemark: string;
}

interface ConversionMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  comment?: string;
}

/**
 * Checks if ffmpeg is installed and accessible
 * @returns Promise<boolean>
 */
export async function checkFfmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableCodecs((err) => {
      resolve(!err);
    });
  });
}

/**
 * Validates that the input file exists and is accessible
 * @param inputPath Path to the input file
 * @throws Error if file doesn't exist or isn't accessible
 */
async function validateInputFile(inputPath: string): Promise<void> {
  try {
    if (!inputPath) {
      throw new Error('Input file path is empty or undefined');
    }
    
    console.log(`Validating input file: ${inputPath}`);
    
    // Check if file exists first
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file does not exist at path: ${inputPath}`);
    }
    
    // Then check if it's readable
    await fsAccess(inputPath, fs.constants.R_OK);
    
    // Get file stats for additional validation
    const stats = fs.statSync(inputPath);
    if (stats.size === 0) {
      throw new Error(`Input file is empty: ${inputPath}`);
    }
    
    console.log(`Successfully validated input file: ${inputPath} (size: ${stats.size} bytes)`);
  } catch (error) {
    console.error(`File validation error for ${inputPath}:`, error);
    if (error instanceof Error) {
      throw new Error(`Input file ${inputPath} does not exist or is not readable: ${error.message}`);
    }
    throw new Error(`Input file ${inputPath} does not exist or is not readable`);
  }
}

/**
 * Ensures the output directory exists
 * @param outputPath Path where the output file will be written
 */
async function ensureOutputDirectory(outputPath: string): Promise<void> {
  const outputDir = path.dirname(outputPath);
  await fs.promises.mkdir(outputDir, { recursive: true });
}

/**
 * Converts a WAV file to MP3 format
 * @param inputPath Path to the input WAV file
 * @param options Optional conversion options
 * @returns Promise<string> Path to the converted MP3 file
 */
export async function convertWavToMp3(
  inputPath: string,
  options: {
    bitrate?: string;
    onProgress?: (progress: ConversionProgress) => void;
  } = {}
): Promise<string> {
  const { bitrate = '320k', onProgress } = options;

  try {
    // Validate input file
    await validateInputFile(inputPath);

    // Create output filename
    const outputPath = inputPath.replace(/\.wav$/i, '.mp3');
    await ensureOutputDirectory(outputPath);

    // Perform the conversion
    return await new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .toFormat('mp3')
        .audioBitrate(bitrate)
        .on('error', (err: Error) => {
          reject(new Error(`Error converting file: ${err.message}`));
        })
        .on('end', () => {
          resolve(outputPath);
        }) as ffmpeg.FfmpegCommand;

      // Add progress handler if provided
      if (onProgress) {
        command.on('progress', (progress: ConversionProgress) => onProgress(progress));
      }

      // Start the conversion
      command.save(outputPath);
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to convert WAV to MP3: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Converts a WAV file to MP3 format with metadata
 * @param inputPath Path to the input WAV file
 * @param metadata Metadata to add to the MP3 file
 * @param options Optional conversion options
 * @returns Promise<string> Path to the converted MP3 file
 */
export async function convertToMp3WithMetadata(
  inputPath: string,
  metadata: ConversionMetadata = {},
  options: {
    bitrate?: string;
    onProgress?: (progress: ConversionProgress) => void;
  } = {}
): Promise<string> {
  const { bitrate = '320k', onProgress } = options;

  try {
    // Validate input file
    await validateInputFile(inputPath);

    // Create output filename
    const outputPath = inputPath.replace(/\.wav$/i, '.mp3');
    await ensureOutputDirectory(outputPath);

    // Perform the conversion
    return await new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .toFormat('mp3')
        .audioBitrate(bitrate) as ffmpeg.FfmpegCommand;

      // Add metadata if provided
      if (Object.keys(metadata).length > 0) {
        command.outputOptions('-metadata', `title=${metadata.title || ''}`)
          .outputOptions('-metadata', `artist=${metadata.artist || ''}`)
          .outputOptions('-metadata', `album=${metadata.album || ''}`)
          .outputOptions('-metadata', `year=${metadata.year || ''}`)
          .outputOptions('-metadata', `genre=${metadata.genre || ''}`)
          .outputOptions('-metadata', `comment=${metadata.comment || ''}`);
      }

      command
        .on('error', (err: Error) => {
          reject(new Error(`Error converting file: ${err.message}`));
        })
        .on('end', () => {
          resolve(outputPath);
        });

      // Add progress handler if provided
      if (onProgress) {
        command.on('progress', (progress: ConversionProgress) => onProgress(progress));
      }

      // Start the conversion
      command.save(outputPath);
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to convert WAV to MP3 with metadata: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Gets audio file information
 * @param filePath Path to the audio file
 * @returns Promise<ffmpeg.FfprobeData> File information
 */
export async function getAudioInfo(filePath: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) {
        reject(new Error(`Failed to get audio info: ${err.message}`));
        return;
      }
      resolve(data);
    });
  });
} 