import type { UUID } from 'crypto';
import type { OparlChunkSource } from 'src/domain/oparl/domain/oparl-chunk-source.enum';
import type {
  OparlFileSkipReason,
  OparlFileTextStatus,
} from 'src/domain/oparl/domain/oparl-file-text';

/** A mirrored file whose text is still to be read, or whose metadata changed since. */
export interface OparlPendingFile {
  id: UUID;
  bodyId: UUID;
  name: string | null;
  fileName: string | null;
  mimeType: string | null;
  accessUrl: string | null;
  downloadUrl: string | null;
  size: number | null;
  /** Of the metadata the content depends on (URLs, size, checksums, `modified`). */
  fingerprint: string;
  /** What the file held when last read, if it was. */
  previous: { status: OparlFileTextStatus; contentHash: string | null } | null;
}

export interface OparlFilePage {
  number: number;
  text: string;
}

export type OparlFileText =
  | {
      status: OparlFileTextStatus.EXTRACTED;
      contentHash: string;
      pages: OparlFilePage[];
    }
  | {
      status: OparlFileTextStatus.SKIPPED;
      reason: OparlFileSkipReason;
      contentHash: string | null;
      error: string | null;
    }
  | { status: OparlFileTextStatus.FAILED; error: string };

/** A paper, meeting or agenda item with the text fields its chunks are built from. */
export interface OparlTextObject {
  source: Exclude<OparlChunkSource, OparlChunkSource.FILE>;
  id: UUID;
  bodyId: UUID;
  /** The meeting of an agenda item. */
  meetingId: UUID | null;
  date: string | null;
  parts: Array<string | null>;
  /** Hash of the text its chunks were built from, `null` without chunks. */
  chunkedHash: string | null;
}

export interface OparlChunkText {
  text: string;
  ordinal: number;
  pageNumber: number | null;
}

export interface OparlChunkToEmbed {
  id: UUID;
  text: string;
}

export interface OparlFileTextCounts {
  total: number;
  pending: number;
  extracted: number;
  failed: number;
  skipped: Record<OparlFileSkipReason, number>;
  /** The error of the file that failed last. */
  lastError: string | null;
}

export interface OparlIndexCounts {
  chunks: number;
  /** Chunks with a vector of the current OParl embedding model. */
  embeddedChunks: number;
}

export interface OparlDocumentStats {
  files: OparlFileTextCounts;
  index: OparlIndexCounts;
}

export function emptyOparlDocumentStats(): OparlDocumentStats {
  return {
    files: {
      total: 0,
      pending: 0,
      extracted: 0,
      failed: 0,
      skipped: {
        too_large: 0,
        too_many_pages: 0,
        unsupported_type: 0,
        unreadable: 0,
      },
      lastError: null,
    },
    index: { chunks: 0, embeddedChunks: 0 },
  };
}
