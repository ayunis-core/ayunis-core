import type { FileRetrieverProcessOptions } from 'src/domain/retrievers/file-retrievers/application/ports/file-retriever.handler';
import { createHash } from 'crypto';
import {
  ProcessingStoppedError,
  type ProcessingContext,
} from 'src/common/types/processing-context';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  FileRetrieverPage,
  FileRetrieverResult,
} from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import { RetrieveFileContentCommand } from './retrieve-file-content.command';
import { FileRetrieverRegistry } from 'src/domain/retrievers/file-retrievers/application/file-retriever-handler.registry';
import {
  File,
  type LocalFile,
} from 'src/domain/retrievers/file-retrievers/domain/file.entity';
import { FileRetrieverType } from 'src/domain/retrievers/file-retrievers/domain/value-objects/file-retriever-type.enum';
import {
  UnprocessableDocumentError,
  FileRetrieverProviderNotAvailableError,
  FileRetrieverUnauthorizedError,
  FileRetrieverUnexpectedError,
  InvalidFileTypeError,
  TooManyPagesError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import {
  DetectedFileType,
  detectFileType,
  getCanonicalMimeType,
  isAudioFile,
  isOfficeDocumentFile,
  MIME_TYPES,
} from 'src/common/util/file-type';
import { EmlAttachment, parseEml } from 'src/common/util/eml';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { DocumentConverterPort } from 'src/domain/retrievers/file-retrievers/application/ports/document-converter.port';
import { MsgParserPort } from 'src/domain/retrievers/file-retrievers/application/ports/msg-parser.port';
import retrievalConfig from 'src/config/retrieval.config';
import { TranscribeRecordingUseCase } from 'src/domain/transcriptions/application/use-cases/transcribe-recording/transcribe-recording.use-case';
import { TranscribeCommand } from 'src/domain/transcriptions/application/use-cases/transcribe/transcribe.command';
import { PreflightCheckUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.use-case';
import { PreflightCheckCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.command';

// Only these are processed from disk; everything else is small and read whole.
function readsFromDisk(fileType: DetectedFileType): boolean {
  return (
    fileType === 'pdf' ||
    isOfficeDocumentFile(fileType) ||
    isAudioFile(fileType)
  );
}

function pdfNameOf(fileName: string): string {
  return fileName.replace(/\.\w+$/, '.pdf');
}

// Attached emails are extracted, but their own attachments stay listed by name.
const MAX_EML_ATTACHMENT_DEPTH = 1;

// Each extracted attachment can cost an OCR call (and a Gotenberg conversion),
// so one uploaded email must not fan out into an unbounded number of them.
const MAX_EXTRACTED_EML_ATTACHMENTS = 10;

// Bound additional work; an in-flight conversion or OCR request can outlast
// this budget. The document consumer heartbeats during extraction.
const EML_ATTACHMENT_TIME_BUDGET_MS = 5 * 60 * 1000;

function attachmentSkipNote(
  sectionCount: number,
  startedAt: number,
): string | undefined {
  if (sectionCount >= MAX_EXTRACTED_EML_ATTACHMENTS) {
    return `[Content not extracted: only the first ${MAX_EXTRACTED_EML_ATTACHMENTS} attachments of an email are extracted.]`;
  }
  if (Date.now() - startedAt >= EML_ATTACHMENT_TIME_BUDGET_MS) {
    return "[Content not extracted: the time available for extracting this email's attachments ran out.]";
  }
  return undefined;
}

function attachmentSection(filename: string, content: string): string {
  return `--- Attachment: ${filename} ---\n${content}`;
}

// Audio is deliberately absent: transcribing attachments would incur
// transcription costs the user never asked for.
function isExtractableAttachment(fileType: DetectedFileType): boolean {
  return (
    fileType === 'pdf' ||
    fileType === 'txt' ||
    fileType === 'eml' ||
    fileType === 'msg' ||
    isOfficeDocumentFile(fileType)
  );
}

@Injectable()
export class RetrieveFileContentUseCase {
  private readonly logger = new Logger(RetrieveFileContentUseCase.name);

  constructor(
    private readonly fileRetrieverRegistry: FileRetrieverRegistry,
    private readonly contextService: ContextService,
    private readonly documentConverter: DocumentConverterPort,
    private readonly msgParser: MsgParserPort,
    private readonly transcribeUseCase: TranscribeRecordingUseCase,
    private readonly preflightCheckUseCase: PreflightCheckUseCase,
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
    return this.retrieve(command, 0);
  }

  private async retrieve(
    command: RetrieveFileContentCommand,
    emlDepth: number,
  ): Promise<FileRetrieverResult> {
    const fileType = detectFileType(command.fileType, command.fileName);
    if (command.localFile && !readsFromDisk(fileType)) {
      throw new Error(`A ${fileType} file cannot be read from disk`);
    }

    if (fileType === 'txt') {
      const text = command.fileData.toString('utf8').replace(/^\uFEFF/, '');
      return new FileRetrieverResult([new FileRetrieverPage(text, 1)]);
    }

    if (fileType === 'eml') {
      return this.processEml(command, emlDepth);
    }

    if (fileType === 'msg') {
      const text = await this.msgParser.extractText(command.fileData);
      return new FileRetrieverResult([new FileRetrieverPage(text, 1)]);
    }

    if (fileType === 'pdf') {
      return await this.processPdf(
        new File(
          command.fileData,
          command.fileName,
          command.fileType,
          command.localFile,
        ),
        {
          allowLocalParsing: command.allowLocalPdfParsing,
          pageLimit: command.pdfPageLimit,
          context: command.processingContext,
          cacheIdentity: command.cacheIdentity,
        },
      );
    }

    if (isOfficeDocumentFile(fileType)) {
      return await this.processOfficeDocument(command);
    }

    if (isAudioFile(fileType)) {
      return await this.processAudio(
        command.fileData,
        command.localFile,
        command.fileName,
        command.fileType,
        command.processingContext,
      );
    }

    throw new InvalidFileTypeError(fileType);
  }

  private async processEml(
    command: RetrieveFileContentCommand,
    emlDepth: number,
  ): Promise<FileRetrieverResult> {
    const { text, attachments } = await parseEml(command.fileData);
    const sections = [text];
    if (emlDepth < MAX_EML_ATTACHMENT_DEPTH) {
      sections.push(
        ...(await this.extractAttachments(attachments, command, emlDepth)),
      );
    }
    return new FileRetrieverResult([
      new FileRetrieverPage(sections.join('\n\n'), 1),
    ]);
  }

  private async extractAttachments(
    attachments: EmlAttachment[],
    command: RetrieveFileContentCommand,
    emlDepth: number,
  ): Promise<string[]> {
    const sections: string[] = [];
    const startedAt = Date.now();
    // Sequential so one email cannot fan out a burst of OCR requests.
    for (const attachment of attachments) {
      const fileType = detectFileType(
        attachment.contentType,
        attachment.filename,
      );
      if (!isExtractableAttachment(fileType)) continue;
      const skipNote = attachmentSkipNote(sections.length, startedAt);
      sections.push(
        skipNote
          ? attachmentSection(attachment.filename, skipNote)
          : await this.extractAttachment(
              attachment,
              fileType,
              command,
              emlDepth,
            ),
      );
    }
    return sections;
  }

  private async extractAttachment(
    attachment: EmlAttachment,
    fileType: DetectedFileType,
    command: RetrieveFileContentCommand,
    emlDepth: number,
  ): Promise<string> {
    // Like direct uploads, trust the detected type over the part's label.
    const mimeType = getCanonicalMimeType(fileType) ?? attachment.contentType;
    try {
      if (fileType === 'pdf') {
        await this.preflightCheckUseCase.execute(
          new PreflightCheckCommand({
            fileData: attachment.content,
            fileName: attachment.filename,
            fileType: mimeType,
          }),
        );
      }
      const result = await this.retrieve(
        new RetrieveFileContentCommand({
          fileData: attachment.content,
          fileName: attachment.filename,
          fileType: mimeType,
          allowLocalPdfParsing: command.allowLocalPdfParsing,
          pdfPageLimit: command.pdfPageLimit,
          processingContext: command.processingContext,
        }),
        emlDepth + 1,
      );
      return attachmentSection(
        attachment.filename,
        result.pages.map((page) => page.text).join('\n'),
      );
    } catch (error) {
      // A stopped source is not a bad attachment: the remaining ones must not
      // be converted either, and the consumer handles the stop.
      if (error instanceof ProcessingStoppedError) throw error;
      this.logger.warn(
        { fileName: attachment.filename, err: error as Error },
        'Could not extract email attachment',
      );
      // Only the page-limit message is shown; other errors may carry
      // provider internals that do not belong in the source text.
      const note =
        error instanceof TooManyPagesError
          ? `[Content could not be extracted: ${error.message}]`
          : '[Content could not be extracted.]';
      return attachmentSection(attachment.filename, note);
    }
  }

  /**
   * PDF: Prefer Mistral OCR, fallback to pdf-parse.
   */
  private async processPdf(
    file: File,
    options: FileRetrieverProcessOptions & { allowLocalParsing?: boolean } = {},
  ): Promise<FileRetrieverResult> {
    const {
      allowLocalParsing = true,
      pageLimit,
      context,
      cacheIdentity,
    } = options;
    if (!this.config.mistral.apiKey) {
      if (!allowLocalParsing) {
        throw new FileRetrieverProviderNotAvailableError('Mistral OCR');
      }
      return this.fileRetrieverRegistry
        .getHandler(FileRetrieverType.NPM_PDF_PARSE)
        .processFile(file);
    }

    try {
      return await this.processWithMistral(
        file,
        pageLimit,
        context,
        cacheIdentity,
      );
    } catch (error) {
      if (!(error instanceof UnprocessableDocumentError)) throw error;
      if (!allowLocalParsing) throw error;
      return this.processLocalPdfFallback(file, error);
    }
  }

  private processWithMistral(
    file: File,
    pageLimit?: number,
    context?: ProcessingContext,
    cacheIdentity?: string,
  ): Promise<FileRetrieverResult> {
    const handler = this.fileRetrieverRegistry.getHandler(
      FileRetrieverType.MISTRAL,
    );
    if (pageLimit === undefined && !context && !cacheIdentity)
      return handler.processFile(file);
    return handler.processFile(file, { pageLimit, context, cacheIdentity });
  }

  private async processLocalPdfFallback(
    file: File,
    ocrError: UnprocessableDocumentError,
  ): Promise<FileRetrieverResult> {
    this.logger.warn(
      { fileName: file.filename },
      'OCR could not read the document; trying local PDF parsing',
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
    throw ocrError;
  }

  /**
   * DOCX/PPTX/ODT/ODP: Convert to PDF via Gotenberg, then process as PDF.
   */
  private async processOfficeDocument(
    command: RetrieveFileContentCommand,
  ): Promise<FileRetrieverResult> {
    const { fileData, fileName, processingContext: context } = command;
    if (command.localFile) {
      return this.processOfficeFile(command.localFile, fileName, context);
    }
    const pdfBuffer = await this.documentConverter.convertToPdf(
      fileData,
      fileName,
    );
    await this.preflightCheckUseCase.execute(
      new PreflightCheckCommand({
        fileData: pdfBuffer,
        fileName,
        fileType: MIME_TYPES.PDF,
      }),
    );
    return this.processPdf(
      new File(pdfBuffer, pdfNameOf(fileName), MIME_TYPES.PDF),
      {
        context,
        cacheIdentity: context
          ? createHash('sha256').update(fileData).digest('hex')
          : undefined,
      },
    );
  }

  // The converted PDF is written next to the original, in the directory the
  // caller staged it in and removes afterwards. Its checkpoints are keyed by
  // the original's hash, as on the in-memory path.
  private async processOfficeFile(
    original: LocalFile,
    fileName: string,
    context?: ProcessingContext,
  ): Promise<FileRetrieverResult> {
    const path = `${original.path}.pdf`;
    const { size } = await this.documentConverter.convertFileToPdf(
      original.path,
      fileName,
      path,
    );
    const pdf: LocalFile = { path, size, sha256: original.sha256 };
    await this.preflightCheckUseCase.execute(
      new PreflightCheckCommand({
        fileData: Buffer.alloc(0),
        localFile: pdf,
        fileName,
        fileType: MIME_TYPES.PDF,
      }),
    );
    return this.processPdf(
      new File(Buffer.alloc(0), pdfNameOf(fileName), MIME_TYPES.PDF, pdf),
      { context, cacheIdentity: context ? original.sha256 : undefined },
    );
  }

  /**
   * Audio: Transcribe via STT and wrap the transcript as a single page.
   * The downstream chunking pipeline flattens pages with join('\n'), so a
   * single-page result is shape-equivalent to a TXT extraction.
   */
  private async processAudio(
    fileData: Buffer,
    recording: LocalFile | undefined,
    fileName: string,
    mimeType: string,
    processingContext?: ProcessingContext,
  ): Promise<FileRetrieverResult> {
    const { text } = await this.transcribeUseCase.execute(
      new TranscribeCommand({
        file: fileData,
        recording,
        fileName,
        mimeType,
        processingContext,
      }),
    );
    return new FileRetrieverResult([new FileRetrieverPage(text, 1)]);
  }
}
