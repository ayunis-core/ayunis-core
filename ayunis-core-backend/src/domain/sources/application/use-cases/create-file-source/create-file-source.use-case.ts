import { Inject, Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { FileSource } from '../../../domain/sources/file-source.entity';
import { SourceContent } from '../../../domain/source-content.entity';
import {
  SourceRepository,
  SOURCE_REPOSITORY,
} from '../../ports/source.repository';
import { CreateFileSourceCommand } from './create-file-source.command';
import { ProcessFileUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/process-file/process-file.use-case';
import { ProcessFileCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/process-file/process-file.command';
import { ProcessTextUseCase } from 'src/domain/rag/splitters/application/use-cases/process-text/process-text.use-case';
import { ProcessTextCommand } from 'src/domain/rag/splitters/application/use-cases/process-text/process-text.command';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { IngestContentUseCase } from 'src/domain/rag/indexers/application/use-cases/ingest-content/ingest-content.use-case';
import { IngestContentCommand } from 'src/domain/rag/indexers/application/use-cases/ingest-content/ingest-content.command';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';

@Injectable()
export class CreateFileSourceUseCase {
  private readonly logger = new Logger(CreateFileSourceUseCase.name);

  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sourceRepository: SourceRepository,
    private readonly processFileUseCase: ProcessFileUseCase,
    private readonly processTextUseCase: ProcessTextUseCase,
    private readonly ingestContentUseCase: IngestContentUseCase,
  ) {}

  async execute(command: CreateFileSourceCommand): Promise<FileSource> {
    this.logger.debug(`Creating file source for file: ${command.fileType}`);

    const fileRetrieverResult = await this.processFileUseCase.execute(
      new ProcessFileCommand({
        orgId: command.orgId,
        fileData: command.fileData,
        fileName: command.fileName,
      }),
    );

    const fileSource = new FileSource({
      fileType: command.fileType,
      fileSize: command.fileSize,
      fileName: command.fileName,
      content: [],
    });
    // TODO: This is a hack to get the id of the source
    // Because cascading is not working as expected
    await this.sourceRepository.create(fileSource);

    fileSource.content = fileRetrieverResult.pages.flatMap((page) =>
      this.getSourceContentsFromText(fileSource.id, page.text, {
        page: page.number,
      }),
    );

    const savedFileSource =
      await this.sourceRepository.createFileSource(fileSource);

    // Index the content using the indexers module
    await this.indexSourceContent(savedFileSource);

    return savedFileSource;
  }

  /**
   * Process text content into source contents
   */
  private getSourceContentsFromText(
    sourceId: UUID,
    text: string,
    meta: Record<string, any> = {},
  ): SourceContent[] {
    const sourceContents: SourceContent[] = [];

    // Split text into content blocks
    const contentBlocks = this.processTextUseCase.execute(
      new ProcessTextCommand(text, SplitterType.RECURSIVE, {
        chunkSize: 2000,
        chunkOverlap: 200,
      }),
    );

    for (const contentBlock of contentBlocks.chunks) {
      // Create source content for each content block
      const sourceContent = new SourceContent({
        sourceId,
        content: contentBlock.text,
        meta,
      });

      sourceContents.push(sourceContent);
    }

    return sourceContents;
  }

  /**
   * Index source content using the indexers module
   */
  private async indexSourceContent(source: FileSource): Promise<void> {
    this.logger.debug(`Indexing content for source: ${source.id}`);

    for (const content of source.content) {
      const ingestCommand = new IngestContentCommand({
        documentId: source.id,
        chunkId: content.id,
        content: content.content,
        type: IndexType.PARENT_CHILD,
      });

      await this.ingestContentUseCase.execute(ingestCommand);
    }

    this.logger.debug(
      `Successfully indexed ${source.content.length} content blocks for source: ${source.id}`,
    );
  }
}
