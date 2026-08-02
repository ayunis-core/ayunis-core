import type { UUID } from 'crypto';
import type { DataSourceFileKind } from '../../domain/data-source-file-kind.type';

export interface DataSourceProcessingTarget {
  sourceId: UUID;
  /** Sheet this source maps to; null for plain CSV files. */
  sheetName: string | null;
}

export interface DataSourceProcessingJobData {
  /**
   * Identity of the upload batch, deliberately independent of any source id:
   * the job and its MinIO file are shared by all sheet sources, so deleting
   * one source must never cancel the job or purge the file (job id and
   * storage path both derive from this).
   */
  uploadId: UUID;
  orgId: UUID;
  userId: UUID;
  minioPath: string;
  fileName: string;
  kind: DataSourceFileKind;
  targets: DataSourceProcessingTarget[];
}

/**
 * Port for enqueuing CSV/spreadsheet parsing jobs. One job fills every
 * pre-created source of the uploaded file (one per sheet). There is no
 * per-source cancellation — the consumer skips sources that are deleted or
 * no longer PROCESSING, and removes the shared file itself.
 */
export abstract class DataSourceProcessingPort {
  abstract enqueue(data: DataSourceProcessingJobData): Promise<void>;
}
