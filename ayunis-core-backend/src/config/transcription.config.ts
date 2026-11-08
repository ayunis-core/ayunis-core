import { registerAs } from '@nestjs/config';

/** Default cap for uploaded recordings; matches the dictation cap until raised. */
export const DEFAULT_AUDIO_UPLOAD_BYTES = 25 * 1024 * 1024;

export default registerAs('transcription', () => ({
  // Uploaded recordings only; browser dictation keeps its own 25 MiB cap.
  maxUploadBytes: Number(
    process.env.AUDIO_MAX_UPLOAD_BYTES || DEFAULT_AUDIO_UPLOAD_BYTES,
  ),
  segmentSeconds: Number(process.env.AUDIO_SEGMENT_MAX_SECONDS || 10_800),
  segmentBytes: Number(process.env.AUDIO_SEGMENT_MAX_BYTES || 25 * 1024 * 1024),
  concurrency: Number(process.env.AUDIO_TRANSCRIPTION_CONCURRENCY || 2),
  requestTimeoutMs: Number(
    process.env.AUDIO_TRANSCRIPTION_TIMEOUT_MS || 300_000,
  ),
  maxDurationSeconds: Number(process.env.AUDIO_MAX_DURATION_SECONDS || 10_800),
  tempDirectory: process.env.AUDIO_TEMP_DIRECTORY || undefined,
}));
