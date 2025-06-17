import { Inject, Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { FileSource } from '../../../domain/sources/file-source.entity';
import { SourceContent } from '../../../domain/source-content.entity';
import { SourceContentChunk } from '../../../domain/source-content-chunk.entity';
import {
  SourceRepository,
  SOURCE_REPOSITORY,
} from '../../ports/source.repository';
import { CreateFileSourceCommand } from './create-file-source.command';
import { ProcessFileUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/process-file/process-file.use-case';
import { ProcessFileCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/process-file/process-file.command';
import { ProcessTextUseCase } from 'src/domain/splitter/application/use-cases/process-text/process-text.use-case';
import { ProcessTextCommand } from 'src/domain/splitter/application/use-cases/process-text/process-text.command';
import { SplitterProvider } from 'src/domain/splitter/domain/splitter-provider.enum';
import { EmbedTextUseCase } from 'src/domain/embeddings/application/use-cases/embed-text/embed-text.use-case';
import { EmbedTextCommand } from 'src/domain/embeddings/application/use-cases/embed-text/embed-text.command';

@Injectable()
export class CreateFileSourceUseCase {
  private readonly logger = new Logger(CreateFileSourceUseCase.name);

  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sourceRepository: SourceRepository,
    private readonly processFileUseCase: ProcessFileUseCase,
    private readonly processTextUseCase: ProcessTextUseCase,
    private readonly embedTextUseCase: EmbedTextUseCase,
  ) {}

  async execute(command: CreateFileSourceCommand): Promise<FileSource> {
    this.logger.debug(
      `Creating file source for thread: ${command.threadId}, file: ${command.fileType}`,
    );

    const fileRetrieverResult = await this.processFileUseCase.execute(
      new ProcessFileCommand(command.fileData, command.fileName),
    );

    const fileSource = new FileSource({
      threadId: command.threadId,
      userId: command.userId,
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

    const chunks = await this.getChunksFromContents(
      savedFileSource.id,
      savedFileSource.content,
    );
    this.logger.debug(`Creating ${chunks.length} chunks`);
    await this.sourceRepository.createSourceContentChunks(chunks);

    return savedFileSource;
  }

  /**
   * Process text content into source contents with chunks
   */
  private getSourceContentsFromText(
    sourceId: UUID,
    text: string,
    meta: Record<string, any> = {},
  ): SourceContent[] {
    const sourceContents: SourceContent[] = [];

    // Split text into content blocks
    const contentBlocks = this.processTextUseCase.execute(
      new ProcessTextCommand(text, SplitterProvider.RECURSIVE, {
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

  private async getChunksFromContents(
    sourceId: UUID,
    sourceContents: SourceContent[],
  ): Promise<SourceContentChunk[]> {
    const sourceContentChunks: SourceContentChunk[] = [];
    this.logger.debug(`Getting chunks from ${sourceContents.length} contents`);

    for (const sourceContent of sourceContents) {
      this.logger.debug(`Getting chunks from content: ${sourceContent.id}`);
      // Split content into smaller chunks for embedding
      const contentChunks = this.processTextUseCase.execute(
        new ProcessTextCommand(
          sourceContent.content,
          SplitterProvider.RECURSIVE,
          {
            chunkSize: 400,
            chunkOverlap: 40,
          },
        ),
      );
      this.logger.debug(
        `Got ${contentChunks.chunks.length} chunks from content: ${sourceContent.id}`,
      );
      const chunkTexts = contentChunks.chunks.map((chunk) => chunk.text);
      this.logger.debug(
        `Embedding ${chunkTexts.length} chunks from content: ${sourceContent.id}`,
      );
      const embeddings = await this.embedTextUseCase.execute(
        new EmbedTextCommand(chunkTexts),
      );
      this.logger.debug(
        `Got ${embeddings.length} embeddings from content: ${sourceContent.id}`,
      );

      const chunks = embeddings.map((embedding) => {
        return new SourceContentChunk({
          sourceId: sourceId,
          sourceContent,
          content: embedding.text,
          embedding: embedding.vector,
          embeddingModel: embedding.model,
        });
      });
      this.logger.debug(
        `Created ${chunks.length} chunks from content: ${sourceContent.id}`,
      );
      sourceContentChunks.push(...chunks);
    }
    this.logger.debug(
      `Created ${sourceContentChunks.length} chunks from ${sourceContents.length} contents`,
    );

    return sourceContentChunks;
  }
}
