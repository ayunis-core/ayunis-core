import type { AudioSegment } from 'src/domain/transcriptions/application/ports/audio-segmenter.port';
import type {
  RecordingTranscript,
  TranscriptSegment,
} from 'src/domain/transcriptions/domain/recording-transcript';
import { TranscriptionFailedError } from 'src/domain/transcriptions/application/transcription.errors';

export function restoreTranscript(
  json: string,
  duration: number,
): RecordingTranscript {
  const result = record(JSON.parse(json) as unknown);
  if (typeof result.text !== 'string' || !Array.isArray(result.segments)) {
    throw new TranscriptionFailedError('Invalid saved transcription result');
  }
  const segments = result.segments.map((segment: unknown) =>
    restoreSegment(segment, duration),
  );
  if (result.text.trim() && segments.length === 0) {
    throw new TranscriptionFailedError('Transcription is missing timestamps');
  }
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].start < segments[i - 1].start)
      throw new TranscriptionFailedError(
        'Transcription timestamps are out of order',
      );
  }
  return { text: result.text, segments };
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TranscriptionFailedError('Invalid transcription result');
  }
  return value as Record<string, unknown>;
}

function time(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TranscriptionFailedError('Invalid transcription timestamp');
  }
  return value;
}

function restoreSegment(value: unknown, duration: number): TranscriptSegment {
  const segment = record(value);
  if (typeof segment.text !== 'string')
    throw new TranscriptionFailedError('Invalid transcription segment');
  const start = time(segment.start);
  const end = time(segment.end);
  if (end < start || end > duration + 1) {
    throw new TranscriptionFailedError('Invalid transcription end time');
  }
  return {
    text: segment.text,
    start: Math.min(start, duration),
    end: Math.min(end, duration),
  };
}

export function formatTranscript(
  result: RecordingTranscript,
  segment: AudioSegment,
): string[] {
  return result.segments
    .filter((part) => part.text.trim())
    .map(
      (part) =>
        `[${timestamp(segment.start + part.start)} - ${timestamp(segment.start + part.end)}] ${part.text.trim()}`,
    );
}

function timestamp(seconds: number): string {
  const milliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor(milliseconds / 60_000) % 60;
  const secs = Math.floor(milliseconds / 1000) % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(milliseconds % 1000).padStart(3, '0')}`;
}
