import { FileRetrieverResult } from '../../domain/file-retriever-result.entity';
import { File } from '../../domain/file.entity';

export abstract class FileRetrieverHandler {
  abstract processFile(file: File): Promise<FileRetrieverResult>;
}
