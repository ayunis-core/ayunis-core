import type { UUID } from 'crypto';

export interface CleanupStaleThreadSourcesResult {
  scannedCount: number;
  unreferencedCount: number;
  deletedCount: number;
  failedCount: number;
  errors: { sourceId: UUID; error: string }[];
}
