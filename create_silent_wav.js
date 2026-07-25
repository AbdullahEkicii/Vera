const fs = require('fs');
const path = require('path');

function generateSilentWav() {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const durationMs = 100; // 100ms
  
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const fileSize = 44 + dataSize;
  
  const buffer = Buffer.alloc(fileSize);
  
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write('WAVE', 8);
  
  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE((sampleRate * numChannels * bitsPerSample) / 8, 28); // ByteRate
  buffer.writeUInt16LE((numChannels * bitsPerSample) / 8, 32); // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34);
  
  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  
  // The rest of the buffer is already filled with 0s (silence)
  
  return buffer;
}

const wavData = generateSilentWav();

const paths = [
  path.join(__dirname, 'android', 'app', 'src', 'main', 'res', 'raw', 'silent.wav'),
  path.join(__dirname, 'assets', 'sounds', 'silent.wav')
];

paths.forEach(p => {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(p, wavData);
  console.log(`Created silent wav at: ${p}`);
});
