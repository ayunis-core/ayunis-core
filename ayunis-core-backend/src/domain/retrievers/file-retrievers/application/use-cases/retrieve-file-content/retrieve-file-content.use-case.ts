import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  FileRetrieverPage,
  FileRetrieverResult,
} from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import {
  ExtractedPageBatch,
  RetrieveFileContentCommand,
} from './retrieve-file-content.command';
import { FileRetrieverRegistry } from '../../file-retriever-handler.registry';
import { PdfTextExtractorPort } from '../../ports/pdf-text-extractor.port';
import { PageOcrPort } from '../../ports/page-ocr.port';
import { File } from 'src/domain/retrievers/file-retrievers/domain/file.entity';
import { FileRetrieverType } from 'src/domain/retrievers/file-retrievers/domain/value-objects/file-retriever-type.enum';
import {
  FileRetrieverUnexpectedError,
  InvalidFileTypeError,
} from '../../file-retriever.errors';
import {
  detectFileType,
  isAudioFile,
  MIME_TYPES,
} from 'src/common/util/file-type';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { DocumentConverterPort } from '../../ports/document-converter.port';
import retrievalConfig from 'src/config/retrieval.config';
import { TranscribeUseCase } from 'src/domain/transcriptions/application/use-cases/transcribe/transcribe.use-case';
import { TranscribeCommand } from 'src/domain/transcriptions/application/use-cases/transcribe/transcribe.command';

// A page whose native text layer has at least this many characters is
// considered born-digital and skips OCR entirely.
const TEXT_LAYER_MIN_CHARS = 50;
// Small enough that a batch finishes well inside one OCR call timeout and
// progress advances visibly; large enough to keep call overhead negligible.
const OCR_BATCH_SIZE = 25;

interface PdfExtractionOptions {
  skipPages?: number[];
  onBatchExtracted?: (batch: ExtractedPageBatch) => Promise<void>;
}

@Injectable()
export class RetrieveFileContentUseCase {
  private readonly logger = new Logger(RetrieveFileContentUseCase.name);

  constructor(
    private readonly fileRetrieverRegistry: FileRetrieverRegistry,
    private readonly contextService: ContextService,
    private readonly documentConverter: DocumentConverterPort,
    private readonly transcribeUseCase: TranscribeUseCase,
    private readonly pdfTextExtractor: PdfTextExtractorPort,
    private readonly pageOcr: PageOcrPort,
    @Inject(retrievalConfig.KEY)
    private readonly config: ConfigType<typeof retrievalConfig>,
  ) {}

  async execute(
    command: RetrieveFileContentCommand,
  ): Promise<FileRetrieverResult> {
    this.logger.debug(`Retrieving file content: ${command.fileName}`);
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('User not authenticated');
    }
    try {
      const fileType = detectFileType(command.fileType, command.fileName);

      if (fileType === 'txt') {
        // TXT/MD: Read directly as UTF-8, no external service needed
        const text = command.fileData.toString('utf8').replace(/^\uFEFF/, '');
        return new FileRetrieverResult([new FileRetrieverPage(text, 1)]);
      }

      if (fileType === 'pdf') {
        return await this.processPdf(
          command.fileData,
          command.fileName,
          command.fileType,
          command,
        );
      }

      if (fileType === 'docx' || fileType === 'pptx') {
        return await this.processOfficeDocument(
          command.fileData,
          command.fileName,
          command,
        );
      }

      if (isAudioFile(fileType)) {
        return await this.processAudio(
          command.fileData,
          command.fileName,
          command.fileType,
        );
      }

      throw new InvalidFileTypeError(fileType);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Unexpected error while retrieving file content', {
        error: error as Error,
      });
      throw new FileRetrieverUnexpectedError(error as Error);
    }
  }

  /**
   * PDF, hybrid: the native text layer is extracted locally and only
   * text-poor pages (scans) are sent to OCR, in page batches. Falls back to
   * whole-file processing when the text layer is unreadable.
   */
  private async processPdf(
    fileData: Buffer,
    fileName: string,
    mimeType: string,
    options: PdfExtractionOptions,
  ): Promise<FileRetrieverResult> {
    let pageTexts: string[];
    try {
      pageTexts = await this.pdfTextExtractor.extractPageTexts(fileData);
    } catch (error) {
      this.logger.warn(
        'Local text-layer extraction failed, falling back to whole-file processing',
        { fileName, error: error as Error },
      );
      return this.processPdfWholeFile(fileData, fileName, mimeType);
    }

    const skip = new Set(options.skipPages ?? []);
    const { localPages, ocrIndexes } = this.partitionByTextLayer(
      pageTexts,
      skip,
    );

    // Text-poor pages without an OCR key keep their (possibly empty) local
    // text — same outcome as the old pdf-parse-only path.
    const canOcr = Boolean(this.config.mistral.apiKey) && ocrIndexes.length > 0;
    if (!canOcr) {
      return this.finishWithoutOcr(pageTexts, localPages, ocrIndexes, {
        skippedPages: skip.size,
        onBatchExtracted: options.onBatchExtracted,
      });
    }

    return this.finishWithOcr(
      new File(fileData, fileName, mimeType),
      { totalPages: pageTexts.length, skippedPages: skip.size },
      localPages,
      ocrIndexes,
      options,
    );
  }

  private async finishWithOcr(
    file: File,
    counts: { totalPages: number; skippedPages: number },
    localPages: FileRetrieverPage[],
    ocrIndexes: number[],
    options: PdfExtractionOptions,
  ): Promise<FileRetrieverResult> {
    const { totalPages } = counts;
    let processedPages = counts.skippedPages + localPages.length;
    if (localPages.length > 0) {
      await options.onBatchExtracted?.({
        pages: localPages,
        processedPages,
        totalPages,
      });
    }

    const ocrPages = await this.ocrInBatches(
      file,
      ocrIndexes,
      async (batchPages) => {
        processedPages += batchPages.length;
        await options.onBatchExtracted?.({
          pages: batchPages,
          processedPages,
          totalPages,
        });
      },
    );

    return new FileRetrieverResult(
      this.sortByPageNumber([...localPages, ...ocrPages]),
    );
  }

  private partitionByTextLayer(
    pageTexts: string[],
    skip: Set<number>,
  ): { localPages: FileRetrieverPage[]; ocrIndexes: number[] } {
    const localPages: FileRetrieverPage[] = [];
    const ocrIndexes: number[] = [];
    pageTexts.forEach((text, index) => {
      if (skip.has(index)) {
        return;
      }
      if (text.trim().length >= TEXT_LAYER_MIN_CHARS) {
        localPages.push(new FileRetrieverPage(text, index + 1));
      } else {
        ocrIndexes.push(index);
      }
    });
    return { localPages, ocrIndexes };
  }

  private async finishWithoutOcr(
    pageTexts: string[],
    localPages: FileRetrieverPage[],
    ocrIndexes: number[],
    context: {
      skippedPages: number;
      onBatchExtracted?: (batch: ExtractedPageBatch) => Promise<void>;
    },
  ): Promise<FileRetrieverResult> {
    const fallbackPages = ocrIndexes.map(
      (index) => new FileRetrieverPage(pageTexts[index], index + 1),
    );
    const pages = this.sortByPageNumber([...localPages, ...fallbackPages]);
    await context.onBatchExtracted?.({
      pages,
      processedPages: context.skippedPages + pages.length,
      totalPages: pageTexts.length,
    });
    return new FileRetrieverResult(pages);
  }

  private async ocrInBatches(
    file: File,
    ocrIndexes: number[],
    onBatch: (pages: FileRetrieverPage[]) => Promise<void>,
  ): Promise<FileRetrieverPage[]> {
    const session = await this.pageOcr.openSession(file);
    const pages: FileRetrieverPage[] = [];
    try {
      for (let i = 0; i < ocrIndexes.length; i += OCR_BATCH_SIZE) {
        const batch = ocrIndexes.slice(i, i + OCR_BATCH_SIZE);
        const batchPages = await session.ocrPages(batch);
        pages.push(...batchPages);
        await onBatch(batchPages);
      }
    } finally {
      await session.close();
    }
    return pages;
  }

  private sortByPageNumber(pages: FileRetrieverPage[]): FileRetrieverPage[] {
    return [...pages].sort((a, b) => a.number - b.number);
  }

  /** Pre-hybrid behavior, kept for PDFs whose text layer cannot be read. */
  private async processPdfWholeFile(
    fileData: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<FileRetrieverResult> {
    const handler = this.config.mistral.apiKey
      ? this.fileRetrieverRegistry.getHandler(FileRetrieverType.MISTRAL)
      : this.fileRetrieverRegistry.getHandler(FileRetrieverType.NPM_PDF_PARSE);

    const file = new File(fileData, fileName, mimeType);
    return handler.processFile(file);
  }

  /**
   * DOCX/PPTX: Convert to PDF via Gotenberg, then process as PDF.
   */
  private async processOfficeDocument(
    fileData: Buffer,
    fileName: string,
    options: PdfExtractionOptions,
  ): Promise<FileRetrieverResult> {
    const pdfBuffer = await this.documentConverter.convertToPdf(
      fileData,
      fileName,
    );
    const pdfFileName = fileName.replace(/\.\w+$/, '.pdf');
    return this.processPdf(pdfBuffer, pdfFileName, MIME_TYPES.PDF, options);
  }

  /**
   * Audio: Transcribe via STT and wrap the transcript as a single page.
   * The downstream chunking pipeline flattens pages with join('\n'), so a
   * single-page result is shape-equivalent to a TXT extraction.
   */
  private async processAudio(
    fileData: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<FileRetrieverResult> {
    const transcript = await this.transcribeUseCase.execute(
      new TranscribeCommand({
        file: fileData,
        fileName,
        mimeType,
      }),
    );
    return new FileRetrieverResult([new FileRetrieverPage(transcript, 1)]);
  }
}
