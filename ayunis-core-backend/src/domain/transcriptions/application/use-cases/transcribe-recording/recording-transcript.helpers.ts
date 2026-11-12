import type { AudioSegment } from 'src/domain/transcriptions/application/ports/audio-segmenter.port';
import type {
  RecordingTranscript,
  TranscriptSegment,
} from 'src/domain/transcriptions/domain/recording-transcript';
import { TranscriptionFailedError } from 'src/domain/transcriptions/application/transcription.errors';
import {
  formatTimestamp,
  speakerTurns,
} from 'src/domain/transcriptions/domain/transcript-turns';

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
  segments.sort((a, b) => a.start - b.start);
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
  if (end < start) {
    throw new TranscriptionFailedError('Invalid transcription end time');
  }
  // The probed duration is an estimate for variable-bitrate containers, so a
  // provider timestamp past it is clamped rather than failing the recording.
  return {
    text: segment.text,
    ...(typeof segment.speakerId === 'string' && {
      speakerId: segment.speakerId,
    }),
    start: Math.min(start, duration),
    end: Math.min(end, duration),
  };
}

export function formatTranscript(
  result: RecordingTranscript,
  segment: AudioSegment,
): string[] {
  if (result.segments.length === 0)
    return result.text.trim() ? [result.text.trim()] : [];
  const speakers = new Map<string, number>();
  return speakerTurns(result.segments)
    .filter((part) => part.text.trim())
    .map((part) => {
      let label = '';
      if (part.speakerId !== undefined) {
        if (!speakers.has(part.speakerId))
          speakers.set(part.speakerId, speakers.size + 1);
        label = `Speaker ${speakers.get(part.speakerId)}: `;
        if (segment.partNumber !== undefined)
          label = `Part ${segment.partNumber} / ${label}`;
      }
      return `[${formatTimestamp(segment.start + part.start)} - ${formatTimestamp(segment.start + part.end)}] ${label}${part.text.trim().replace(/\s+/g, ' ')}`;
    });
}

/**
 * The part's segments in recording time. Speaker labels stay the provider's,
 * scoped to the part when the recording had to be split, since the provider
 * only keeps them consistent within one request.
 */
export function toRecordingSegments(
  result: RecordingTranscript,
  segment: AudioSegment,
): TranscriptSegment[] {
  if (result.segments.length === 0) {
    const text = result.text.trim();
    return text
      ? [{ text, start: segment.start, end: segment.start + segment.duration }]
      : [];
  }
  return result.segments
    .filter((part) => part.text.trim())
    .map((part) => ({
      text: part.text.trim(),
      start: segment.start + part.start,
      end: segment.start + part.end,
      ...(part.speakerId !== undefined && {
        speakerId:
          segment.partNumber === undefined
            ? part.speakerId
            : `part-${segment.partNumber}/${part.speakerId}`,
      }),
    }));
}
