import type { ProcessingContext } from 'src/common/types/processing-context';

/** The recording either as bytes, or as a file the caller owns on local disk. */
export type RecordingInput = { fileName: string; mimeType: string } & (
  { data: Buffer } | { path: string; size: number }
);

export interface AudioSegmentLimits {
  maxSeconds: number;
  maxBytes: number;
}

export interface AudioSegment {
  partNumber?: number;
  path: string;
  start: number;
  duration: number;
  mimeType: string;
  fileName: string;
}

export abstract class AudioSegmenterPort {
  abstract split(
    input: RecordingInput,
    limits: AudioSegmentLimits,
    context?: ProcessingContext,
  ): AsyncIterable<AudioSegment>;
}
