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
} from '../../../domain/file-retriever-result.entity';
import { RetrieveFileContentCommand } from './retrieve-file-content.command';
import { FileRetrieverRegistry } from '../../file-retriever-handler.registry';
import { File } from '../../../domain/file.entity';
import { FileRetrieverType } from '../../../domain/value-objects/file-retriever-type.enum';
import {
  FileRetrieverUnexpectedError,
  InvalidFileTypeError,
} from '../../file-retriever.errors';
import { detectFileType, MIME_TYPES } from 'src/common/util/file-type';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { DocumentConverterPort } from '../../ports/document-converter.port';
import retrievalConfig from 'src/config/retrieval.config';

@Injectable()
export class RetrieveFileContentUseCase {
  private readonly logger = new Logger(RetrieveFileContentUseCase.name);

  constructor(
    private readonly fileRetrieverRegistry: FileRetrieverRegistry,
    private readonly contextService: ContextService,
    private readonly documentConverter: DocumentConverterPort,
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
        );
      }

      if (fileType === 'docx' || fileType === 'pptx') {
        return await this.processOfficeDocument(
          command.fileData,
          command.fileName,
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
   * PDF: Prefer Mistral OCR, fallback to pdf-parse.
   */
  private async processPdf(
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
  ): Promise<FileRetrieverResult> {
    const pdfBuffer = await this.documentConverter.convertToPdf(
      fileData,
      fileName,
    );
    const pdfFileName = fileName.replace(/\.\w+$/, '.pdf');
    return this.processPdf(pdfBuffer, pdfFileName, MIME_TYPES.PDF);
  }
}
