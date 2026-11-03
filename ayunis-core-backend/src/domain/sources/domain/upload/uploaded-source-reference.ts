import type { UUID } from 'crypto';

/** One pre-created source of a completed upload (one per sheet for tables). */
export interface UploadedSourceReference {
  sourceId: UUID;
  sheetName: string | null;
  /** Identity verified at completion; retained for queue retries. */
  expectedETag?: string;
}
