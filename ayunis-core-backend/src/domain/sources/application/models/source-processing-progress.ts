import type { UUID } from 'crypto';

export enum SourceProcessingStage {
  QUEUED = 'queued',
  PREPARING = 'preparing',
  EXTRACTING = 'extracting',
  INDEXING = 'indexing',
  RETRYING = 'retrying',
  READY = 'ready',
  FAILED = 'failed',
}

export interface SourceProcessingProgress {
  sourceId: UUID;
  stage: SourceProcessingStage;
  completed?: number;
  unit?: 'pages' | 'parts';
}
