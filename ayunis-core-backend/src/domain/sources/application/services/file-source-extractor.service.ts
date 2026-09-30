import { Injectable, Logger } from '@nestjs/common';
import { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import { RetrieveFileContentCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.command';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import {
  cleanupMinioProcessingFile,
  downloadMinioFile,
} from 'src/domain/sources/application/util/minio-processing-file.helpers';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import {
  type ExtractedTextSourceContent,
  TextSourceExtractor,
} from './text-source-extractor';

export interface FileSourceInput {
  minioPath: string;
  fileName: string;
  fileType: string;
}

/** Extracts an uploaded file staged in MinIO; the staged copy is removed on release. */
@Injectable()
export class FileSourceExtractor extends TextSourceExtractor<FileSourceInput> {
  private readonly logger = new Logger(FileSourceExtractor.name);

  constructor(
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly retrieveFileContentUseCase: RetrieveFileContentUseCase,
    private readonly splitTextUseCase: SplitTextUseCase,
  ) {
    super();
  }

  async extract(input: FileSourceInput): Promise<ExtractedTextSourceContent> {
    const { minioPath, fileName, fileType } = input;
    const fileData = await downloadMinioFile(
      this.downloadObjectUseCase,
      minioPath,
    );
    const result = await this.retrieveFileContentUseCase.execute(
      new RetrieveFileContentCommand({ fileData, fileName, fileType }),
    );
    const text = result.pages.map((page) => page.text).join('\n');

    const split = this.splitTextUseCase.execute(
      new SplitTextCommand(text, SplitterType.RECURSIVE, {
        chunkSize: 2000,
        chunkOverlap: 200,
      }),
    );
    const chunks = split.chunks.map(
      (chunk) =>
        new TextSourceContentChunk({
          content: chunk.text,
          meta: { fileName, ...chunk.metadata },
        }),
    );
    return { text, chunks };
  }

  override async release(input: FileSourceInput): Promise<void> {
    await cleanupMinioProcessingFile(
      this.deleteObjectUseCase,
      this.logger,
      input.minioPath,
    );
  }
}
