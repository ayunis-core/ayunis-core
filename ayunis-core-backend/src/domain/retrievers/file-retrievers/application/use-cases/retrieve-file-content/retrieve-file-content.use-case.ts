import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigType } from '@nestjs/config';
import {
  FileRetrieverPage,
  FileRetrieverResult,
} from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import { RetrieveFileContentCommand } from './retrieve-file-content.command';
import { FileRetrieverRegistry } from '../../file-retriever-handler.registry';
import { File } from 'src/domain/retrievers/file-retrievers/domain/file.entity';
import { FileRetrieverType } from 'src/domain/retrievers/file-retrievers/domain/value-objects/file-retriever-type.enum';
import {
  EmptyOcrResultError,
  FileRetrieverUnauthorizedError,
  FileRetrieverUnexpectedError,
  InvalidFileTypeError,
} from '../../file-retriever.errors';
import {
  detectFileType,
  isAudioFile,
  MIME_TYPES,
} from 'src/common/util/file-type';
import { extractTextFromEml } from 'src/common/util/eml';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { DocumentConverterPort } from '../../ports/document-converter.port';
import retrievalConfig from 'src/config/retrieval.config';
import { TranscribeUseCase } from 'src/domain/transcriptions/application/use-cases/transcribe/transcribe.use-case';
import { TranscribeCommand } from 'src/domain/transcriptions/application/use-cases/transcribe/transcribe.command';

@Injectable()
export class RetrieveFileContentUseCase {
  constructor(
    @InjectPinoLogger(RetrieveFileContentUseCase.name)
    private readonly logger: PinoLogger,
    private readonly fileRetrieverRegistry: FileRetrieverRegistry,
    private readonly contextService: ContextService,
    private readonly documentConverter: DocumentConverterPort,
    private readonly transcribeUseCase: TranscribeUseCase,
    @Inject(retrievalConfig.KEY)
    private readonly config: ConfigType<typeof retrievalConfig>,
  ) {}

  @HandleUnexpectedErrors(FileRetrieverUnexpectedError)
  async execute(
    command: RetrieveFileContentCommand,
  ): Promise<FileRetrieverResult> {
    this.logger.debug(
      { fileName: command.fileName },
      'Retrieving file content',
    );
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new FileRetrieverUnauthorizedError();
    }
    const fileType = detectFileType(command.fileType, command.fileName);

    if (fileType === 'txt') {
      const text = command.fileData.toString('utf8').replace(/^\uFEFF/, '');
      return new FileRetrieverResult([new FileRetrieverPage(text, 1)]);
    }

    if (fileType === 'eml') {
      const text = await extractTextFromEml(command.fileData);
      return new FileRetrieverResult([new FileRetrieverPage(text, 1)]);
    }

    if (fileType === 'pdf') {
      return await this.processPdf(
        command.fileData,
        command.fileName,
        command.fileType,
      );
    }

    if (fileType === 'docx' || fileType === 'pptx') {
      return await this.processOfficeDocument(
        command.fileData,
        command.fileName,
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
  }

  /**
   * PDF: Prefer Mistral OCR, fallback to pdf-parse.
   */
  private async processPdf(
    fileData: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<FileRetrieverResult> {
    const file = new File(fileData, fileName, mimeType);
    if (!this.config.mistral.apiKey) {
      return this.fileRetrieverRegistry
        .getHandler(FileRetrieverType.NPM_PDF_PARSE)
        .processFile(file);
    }

    try {
      return await this.fileRetrieverRegistry
        .getHandler(FileRetrieverType.MISTRAL)
        .processFile(file);
    } catch (error) {
      if (!(error instanceof EmptyOcrResultError)) throw error;
      return this.processEmptyOcrFallback(file, error);
    }
  }

  private async processEmptyOcrFallback(
    file: File,
    emptyOcrError: EmptyOcrResultError,
  ): Promise<FileRetrieverResult> {
    this.logger.warn(
      { fileName: file.filename },
      'Mistral returned no pages; trying local PDF parsing',
    );
    try {
      const result = await this.fileRetrieverRegistry
        .getHandler(FileRetrieverType.NPM_PDF_PARSE)
        .processFile(file);
      if (result.pages.some((page) => page.text.trim().length > 0)) {
        return result;
      }
    } catch (error) {
      this.logger.warn(
        { fileName: file.filename, err: error as Error },
        'Local PDF fallback failed',
      );
    }
    throw emptyOcrError;
  }

  /**
   * DOCX/PPTX: Convert to PDF via Gotenberg, then process as PDF.
   */
  private async processOfficeDocument(
    fileData: Buffer,
    fileName: string,
  ): Promise<FileRetrieverResult> {
    const pdfBuffer = await this.documentConverter.convertToPdf(
      fileData,
      fileName,
    );
    const pdfFileName = fileName.replace(/\.\w+$/, '.pdf');
    return this.processPdf(pdfBuffer, pdfFileName, MIME_TYPES.PDF);
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
