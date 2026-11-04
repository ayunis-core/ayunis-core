import type { FileRetrieverResult } from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import type { File } from 'src/domain/retrievers/file-retrievers/domain/file.entity';
import type { ProcessingContext } from 'src/common/types/processing-context';

export interface FileRetrieverProcessOptions {
  pageLimit?: number;
  context?: ProcessingContext;
  cacheIdentity?: string;
}

export abstract class FileRetrieverHandler {
  abstract processFile(
    file: File,
    options?: FileRetrieverProcessOptions,
  ): Promise<FileRetrieverResult>;
}

export abstract class PdfOcrRequestPort extends FileRetrieverHandler {}
