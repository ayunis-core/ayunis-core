import { InvalidAudioFileError } from 'src/domain/transcriptions/application/transcription.errors';

export const MAX_AUDIO_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
];

export function validateAudio(file: Buffer, mimeType: string): void {
  if (file.length === 0) throw new InvalidAudioFileError('Empty audio file');
  if (file.length > MAX_AUDIO_FILE_SIZE_BYTES) {
    throw new InvalidAudioFileError(
      'Audio file size exceeds maximum allowed size of 25 MB',
    );
  }
  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    throw new InvalidAudioFileError(`Unsupported audio format: ${mimeType}`);
  }
}
