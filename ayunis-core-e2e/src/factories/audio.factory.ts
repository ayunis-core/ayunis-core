import { Buffer } from 'node:buffer';

/**
 * Silent 16 kHz mono PCM WAV of the given length. The transcription contract
 * server answers with a fixed two-speaker meeting, so the audio itself only
 * has to be valid and long enough.
 */
export function createSilentWav(seconds: number): Buffer {
  const size = seconds * 32000;
  const data = Buffer.alloc(size + 44);
  data.write('RIFF');
  data.writeUInt32LE(size + 36, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(16000, 24);
  data.writeUInt32LE(32000, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(size, 40);
  return data;
}
