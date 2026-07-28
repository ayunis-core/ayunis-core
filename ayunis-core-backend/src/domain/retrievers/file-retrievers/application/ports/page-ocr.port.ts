import type { File } from '../../domain/file.entity';
import type { FileRetrieverPage } from '../../domain/file-retriever-result.entity';

/**
 * One remote OCR conversation over a single uploaded document: the file is
 * uploaded once, then arbitrary page subsets can be OCR'd until close().
 */
export interface OcrSession {
  /** 0-based page indexes; returns one FileRetrieverPage per requested index. */
  ocrPages(pageIndexes: number[]): Promise<FileRetrieverPage[]>;
  /** Best-effort remote cleanup; never throws. */
  close(): Promise<void>;
}

/**
 * Port for page-scoped OCR. Callers decide *which* pages need OCR (hybrid
 * extraction) and batch them; the adapter owns the vendor session mechanics.
 */
export abstract class PageOcrPort {
  abstract openSession(file: File): Promise<OcrSession>;
}
