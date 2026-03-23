import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
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
import { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import { DeleteContentCommand } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.command';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { SourceRepository } from '../../ports/source.repository';
import { RetrieveFileContentCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.command';
import { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import { MIME_TYPES } from 'src/common/util/file-type';

/** Max concurrent embedding API calls per source ingestion to avoid rate limits */
const EMBEDDING_CONCURRENCY = 20;

interface TextSourceWithContent {
  source: TextSource;
  text: string;
  chunks: TextSourceContentChunk[];
}

@Injectable()
export class CreateTextSourceUseCase {
  private readonly logger = new Logger(CreateTextSourceUseCase.name);

  constructor(
    private readonly retrieveUrlUseCase: RetrieveUrlUseCase,
    private readonly contextService: ContextService,
    private readonly retrieveFileContentUseCase: RetrieveFileContentUseCase,
    private readonly splitTextUseCase: SplitTextUseCase,
    private readonly ingestContentUseCase: IngestContentUseCase,
    private readonly deleteContentUseCase: DeleteContentUseCase,
    private readonly sourceRepository: SourceRepository,
  ) {}

  async execute(command: CreateFileSourceCommand): Promise<FileSource>;
  async execute(command: CreateUrlSourceCommand): Promise<UrlSource>;
  @Transactional()
  async execute(command: CreateTextSourceCommand): Promise<TextSource> {
    this.logger.debug('Creating text source');
    const orgId = this.contextService.get('orgId');
    try {
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }
      let result: TextSourceWithContent;
      if (command instanceof CreateFileSourceCommand) {
        result = await this.createFileSource(command);
      } else if (command instanceof CreateUrlSourceCommand) {
        result = await this.createUrlSource(command);
      } else {
        throw new InvalidSourceTypeError(command.constructor.name);
      }
      this.logger.debug('Saving source', { sourceId: result.source.id });
      const saved = await this.sourceRepository.saveTextSource(result.source, {
        text: result.text,
        chunks: result.chunks,
      });
      await this.indexSourceContentChunks({
        sourceId: saved.id,
        chunks: result.chunks,
        orgId,
      });
      return saved;
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
  ): Promise<TextSourceWithContent> {
    const fileRetrieverResult = await this.retrieveFileContentUseCase.execute(
      new RetrieveFileContentCommand({
        fileData: command.fileData,
        fileName: command.fileName,
        fileType: command.fileType,
      }),
    );
    const text = fileRetrieverResult.pages.map((page) => page.text).join('\n');
    const chunks = this.getChunksFromText(text, {
      fileName: command.fileName,
    });

    const source = new FileSource({
      fileType: this.getFileType(command.fileType),
      name: command.fileName,
      type: TextType.FILE,
    });

    return { source, text, chunks };
  }

  private async createUrlSource(
    command: CreateUrlSourceCommand,
  ): Promise<TextSourceWithContent> {
    const urlRetrieverResult = await this.retrieveUrlUseCase.execute(
      new RetrieveUrlCommand(command.url),
    );

    const chunks = this.getChunksFromText(urlRetrieverResult.content, {
      url: command.url,
    });

    const source = new UrlSource({
      name: urlRetrieverResult.websiteTitle,
      type: TextType.WEB,
      url: command.url,
    });

    return { source, text: urlRetrieverResult.content, chunks };
  }

  private getFileType(mimeType: string): FileType {
    switch (mimeType) {
      case MIME_TYPES.PDF:
        return FileType.PDF;
      case MIME_TYPES.DOCX:
        return FileType.DOCX;
      case MIME_TYPES.PPTX:
        return FileType.PPTX;
      case MIME_TYPES.TXT:
        return FileType.TXT;
      default:
        // This is a programming error - caller should validate/route file types before calling this use case
        throw new Error(
          `CreateTextSourceUseCase received unsupported file type: ${mimeType}. ` +
            `This use case only handles PDF, DOCX, PPTX, and TXT. Spreadsheets should be routed to CreateDataSourceUseCase.`,
        );
    }
  }

  /**
   * Process text content into source contents
   */
  private getChunksFromText(
    text: string,
    meta: Record<string, unknown> = {},
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
      const chunk = new TextSourceContentChunk({
        content: contentBlock.text,
        meta: {
          ...meta,
          ...contentBlock.metadata,
        },
      });

      sourceContentChunks.push(chunk);
    }

    return sourceContentChunks;
  }

  /**
   * Index source content using the indexers module.
   * Uses delete-once-then-parallel-ingest pattern to avoid race conditions
   * while maintaining performance for parallel chunk processing.
   * Concurrency is capped to avoid hitting embedding API rate limits.
   */
  private async indexSourceContentChunks(params: {
    sourceId: UUID;
    chunks: TextSourceContentChunk[];
    orgId: UUID;
  }): Promise<void> {
    this.logger.debug(`Indexing content for source: ${params.sourceId}`);

    // Step 1: Delete any existing index entries for this source ONCE
    // (handles re-upload/re-index scenarios, no-op for new sources)
    await this.deleteContentUseCase.execute(
      new DeleteContentCommand({ documentId: params.sourceId }),
    );

    // Step 2: Ingest all chunks with bounded concurrency
    // Safe because deletion is handled above, not in the ingest use case
    const { default: pLimit } = await import('p-limit');
    const limit = pLimit(EMBEDDING_CONCURRENCY);
    await Promise.all(
      params.chunks.map((chunk) =>
        limit(async () => {
          const ingestCommand = new IngestContentCommand({
            orgId: params.orgId,
            documentId: params.sourceId,
            chunkId: chunk.id,
            content: chunk.content,
            type: IndexType.PARENT_CHILD,
          });

          await this.ingestContentUseCase.execute(ingestCommand);
        }),
      ),
    );

    this.logger.debug(
      `Successfully indexed ${params.chunks.length} content blocks for source: ${params.sourceId}`,
    );
  }
}
