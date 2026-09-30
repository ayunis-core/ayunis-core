import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import {
  FileSource,
  TextSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
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
} from 'src/domain/sources/application/sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { RetrieveUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.command';
import { RetrieveUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.use-case';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { UUID } from 'crypto';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { RetrieveFileContentCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.command';
import { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import { fileTypeFromMimeType } from 'src/domain/sources/application/util/source-file-type.helpers';
import { SourceContentReplacementService } from 'src/domain/sources/application/services/source-content-replacement.service';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import type { PreparedTextSourceContent } from 'src/domain/sources/application/models/prepared-text-source-content';

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
    private readonly sourceRepository: SourceRepository,
    private readonly contentReplacement: SourceContentReplacementService,
  ) {}

  async execute(command: CreateFileSourceCommand): Promise<FileSource>;
  async execute(command: CreateUrlSourceCommand): Promise<UrlSource>;
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
        result = await this.createUrlSource(command, orgId);
      } else {
        throw new InvalidSourceTypeError(command.constructor.name);
      }
      const content = await this.contentReplacement.prepare({
        sourceId: result.source.id,
        orgId,
        text: result.text,
        chunks: result.chunks,
      });
      this.logger.debug({ sourceId: result.source.id }, 'Saving source');
      return await this.persist(result.source, content);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error creating text source',
      );
      throw new UnexpectedSourceError('Error creating text source', {
        error: error as Error,
      });
    }
  }

  // The content commit only writes onto an existing row, so the new row is
  // inserted first, in the same transaction.
  @Transactional()
  private async persist(
    source: TextSource,
    content: PreparedTextSourceContent,
  ): Promise<TextSource> {
    source.recordIndexed(new Date());
    await this.sourceRepository.save(source);
    const saved = await this.contentReplacement.commit(source, content);
    if (!saved) {
      throw new Error(`Source ${source.id} vanished while being created`);
    }
    return saved;
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
    orgId: UUID,
  ): Promise<TextSourceWithContent> {
    const urlRetrieverResult = await this.retrieveUrlUseCase.execute(
      new RetrieveUrlCommand(command.url, orgId),
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
    const fileType = fileTypeFromMimeType(mimeType);
    if (!fileType) {
      // This is a programming error - caller should validate/route file types before calling this use case
      throw new Error(
        `CreateTextSourceUseCase received unsupported file type: ${mimeType}. ` +
          `This use case only handles PDF, DOCX, PPTX, ODT, ODP, TXT, EML, and audio. Spreadsheets should be routed to CreateDataSourceUseCase.`,
      );
    }
    return fileType;
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
}
