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
  file: Buffer,
  mimeType: string,
  maxBytes: number = MAX_AUDIO_FILE_SIZE_BYTES,
): void {
  if (file.length === 0) throw new InvalidAudioFileError('Empty audio file');
  if (file.length > maxBytes) {
    throw new InvalidAudioFileError(
      `Audio file size exceeds maximum allowed size of ${Math.floor(maxBytes / (1024 * 1024))} MB`,
    );
  }
  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    throw new InvalidAudioFileError(`Unsupported audio format: ${mimeType}`);
  }
}
