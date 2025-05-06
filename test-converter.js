const { convertToMp3WithMetadata } = require('./dist/lib/audio-converter');

async function test() {
  try {
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
  }
}

test(); 