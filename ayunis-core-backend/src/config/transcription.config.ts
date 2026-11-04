import { registerAs } from '@nestjs/config';

export default registerAs('transcription', () => ({
  segmentSeconds: Number(process.env.AUDIO_SEGMENT_MAX_SECONDS || 600),
  segmentBytes: Number(process.env.AUDIO_SEGMENT_MAX_BYTES || 20 * 1024 * 1024),
  concurrency: Number(process.env.AUDIO_TRANSCRIPTION_CONCURRENCY || 2),
  requestTimeoutMs: Number(
    process.env.AUDIO_TRANSCRIPTION_TIMEOUT_MS || 120_000,
  ),
  maxDurationSeconds: Number(process.env.AUDIO_MAX_DURATION_SECONDS || 10_800),
  tempDirectory: process.env.AUDIO_TEMP_DIRECTORY || undefined,
}));
