import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import {
  FileSource,
  TextSource,
  UrlSource,
} from '../../../domain/sources/text-source.entity';
import {
  CreateTextSourceCommand,
  CreateFileSourceCommand,
  CreateUrlSourceCommand,
} from './create-text-source.command';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import {
  InvalidSourceTypeError,
  UnexpectedSourceError,
} from '../../sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { RetrieveUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.command';
import { RetrieveUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.use-case';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { UUID } from 'crypto';
import { IngestContentCommand } from 'src/domain/rag/indexers/application/use-cases/ingest-content/ingest-content.command';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { IngestContentUseCase } from 'src/domain/rag/indexers/application/use-cases/ingest-content/ingest-content.use-case';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { SourceRepository } from '../../ports/source.repository';
import { RetrieveFileContentCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.command';
import { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';

@Injectable()
export class CreateTextSourceUseCase {
  private readonly logger = new Logger(CreateTextSourceUseCase.name);

  constructor(
    private readonly retrieveUrlUseCase: RetrieveUrlUseCase,
    private readonly contextService: ContextService,
    private readonly retrieveFileContentUseCase: RetrieveFileContentUseCase,
    private readonly splitTextUseCase: SplitTextUseCase,
    private readonly ingestContentUseCase: IngestContentUseCase,
    private readonly sourceRepository: SourceRepository,
  ) {}

  async execute(command: CreateFileSourceCommand): Promise<FileSource>;
  async execute(command: CreateUrlSourceCommand): Promise<UrlSource>;
  async execute(command: CreateTextSourceCommand): Promise<TextSource> {
    this.logger.debug('Creating text source', { command });
    const orgId = this.contextService.get('orgId');
    try {
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }
      let source: TextSource;
      if (command instanceof CreateFileSourceCommand) {
        source = await this.createFileSource(command);
      } else if (command instanceof CreateUrlSourceCommand) {
        source = await this.createUrlSource(command);
      } else {
        throw new InvalidSourceTypeError(command.constructor.name);
      }
      this.logger.debug('Saving source', { source });
      await this.sourceRepository.save(source);
      await this.indexSourceContentChunks({ source, orgId });
      return source;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error creating text source', {
        error: error as Error,
      });
      throw new UnexpectedSourceError('Error creating text source', {
        error: error as Error,
      });
    }
  }

  private async createFileSource(
    command: CreateFileSourceCommand,
  ): Promise<FileSource> {
    const fileRetrieverResult = await this.retrieveFileContentUseCase.execute(
      new RetrieveFileContentCommand({
        fileData: command.fileData,
        fileName: command.fileName,
        fileType: command.fileType,
      }),
    );
    const text = fileRetrieverResult.pages.map((page) => page.text).join('\n');
    const contentChunks = this.getChunksFromText(text, {
      fileName: command.fileName,
    });

    return new FileSource({
      fileType: this.getFileType(command.fileType),
      name: command.fileName,
      text,
      contentChunks,
      type: TextType.FILE,
    });
  }

  private async createUrlSource(
    command: CreateUrlSourceCommand,
  ): Promise<UrlSource> {
    const urlRetrieverResult = await this.retrieveUrlUseCase.execute(
      new RetrieveUrlCommand(command.url),
    );

    const sourceContents = this.getChunksFromText(urlRetrieverResult.content, {
      url: command.url,
    });
    return new UrlSource({
      contentChunks: sourceContents,
      text: urlRetrieverResult.content,
      name: urlRetrieverResult.websiteTitle,
      type: TextType.WEB,
      url: command.url,
    });
  }

  private getFileType(fileType: string): FileType {
    if (fileType === 'application/pdf') {
      return FileType.PDF;
    }
    throw new Error('Invalid file type');
  }

  /**
   * Process text content into source contents
   */
  private getChunksFromText(
    text: string,
    meta: Record<string, any> = {},
  ): TextSourceContentChunk[] {
    const sourceContentChunks: TextSourceContentChunk[] = [];

    // Split text into content blocks
    const contentBlocks = this.splitTextUseCase.execute(
      new SplitTextCommand(text, SplitterType.RECURSIVE, {
        chunkSize: 2000,
        chunkOverlap: 200,
      }),
    );

    for (const contentBlock of contentBlocks.chunks) {
      // Create source content for each content block
      const chunk = new TextSourceContentChunk({
        content: contentBlock.text,
        meta,
      });

      sourceContentChunks.push(chunk);
    }

    return sourceContentChunks;
  }

  /**
   * Index source content using the indexers module
   */
  private async indexSourceContentChunks(params: {
    source: TextSource;
    orgId: UUID;
  }): Promise<void> {
    this.logger.debug(`Indexing content for source: ${params.source.id}`);

    await Promise.all(
      params.source.contentChunks.map(async (chunk) => {
        const ingestCommand = new IngestContentCommand({
          orgId: params.orgId,
          documentId: params.source.id,
          chunkId: chunk.id,
          content: chunk.content,
          type: IndexType.PARENT_CHILD,
        });

        await this.ingestContentUseCase.execute(ingestCommand);
      }),
    );

    this.logger.debug(
      `Successfully indexed ${params.source.contentChunks.length} content blocks for source: ${params.source.id}`,
    );
  }
}
