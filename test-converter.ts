import { convertToMp3WithMetadata } from './src/lib/audio-converter';

async function test() {
  try {
    console.log('Starting conversion...');
    const result = await convertToMp3WithMetadata(
      '/Users/serafinsanchez/topline/toplineapp/Kendrick Lamar - Not Like Us_acapella.wav',
      {
        title: 'Not Like Us (Acapella)',
        artist: 'Kendrick Lamar'
      },
      {
        onProgress: (progress) => console.log(`Progress: ${progress.percent}%`)
      }
    );
    console.log('Conversion successful! Output file:', result);
  } catch (error) {
    console.error('Conversion failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
  }
}

test(); 