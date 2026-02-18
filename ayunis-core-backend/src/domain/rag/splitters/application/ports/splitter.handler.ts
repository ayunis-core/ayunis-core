import { SplitResult } from '../../domain/split-result.entity';

export interface SplitterMetadata {
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface SplitterInput {
  text: string;
  metadata?: SplitterMetadata;
}

export abstract class SplitterHandler {
  abstract processText(input: SplitterInput): SplitResult;
  abstract isAvailable(): boolean;
}
