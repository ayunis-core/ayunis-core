import type { FileRetrieverResult } from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import type { File } from 'src/domain/retrievers/file-retrievers/domain/file.entity';

export interface FileRetrieverProcessOptions {
  pageLimit?: number;
}

export abstract class FileRetrieverHandler {
  abstract processFile(
    file: File,
    options?: FileRetrieverProcessOptions,
  ): Promise<FileRetrieverResult>;
}
