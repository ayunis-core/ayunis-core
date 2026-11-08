import { InvalidAudioFileError } from 'src/domain/transcriptions/application/transcription.errors';

export const MAX_AUDIO_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
];

export function validateAudio(
  file: Buffer | { size: number },
  mimeType: string,
  maxBytes: number = MAX_AUDIO_FILE_SIZE_BYTES,
): void {
  const size = Buffer.isBuffer(file) ? file.length : file.size;
  if (size === 0) throw new InvalidAudioFileError('Empty audio file');
  if (size > maxBytes) {
    throw new InvalidAudioFileError(
      `Audio file size exceeds maximum allowed size of ${Math.floor(maxBytes / (1024 * 1024))} MB`,
    );
  }
  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    throw new InvalidAudioFileError(`Unsupported audio format: ${mimeType}`);
  }
}
