import type { ProcessingContext } from 'src/common/types/processing-context';

export interface RecordingInput {
  data: Buffer;
  fileName: string;
  mimeType: string;
}

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
