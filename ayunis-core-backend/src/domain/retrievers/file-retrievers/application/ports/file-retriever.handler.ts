import type { FileRetrieverResult } from '../../domain/file-retriever-result.entity';
import type { File } from '../../domain/file.entity';

export abstract class FileRetrieverHandler {
  abstract processFile(file: File): Promise<FileRetrieverResult>;
}
