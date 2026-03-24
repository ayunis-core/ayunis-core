import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PreflightCheckCommand } from './preflight-check.command';
import { DocumentTooLargeForChatError } from '../../file-retriever.errors';
import { detectFileType } from 'src/common/util/file-type';
import retrievalConfig from 'src/config/retrieval.config';
import PdfParse from 'pdf-parse';

@Injectable()
export class PreflightCheckUseCase {
  private readonly logger = new Logger(PreflightCheckUseCase.name);

  constructor(
    @Inject(retrievalConfig.KEY)
    private readonly config: ConfigType<typeof retrievalConfig>,
  ) {}

  async execute(command: PreflightCheckCommand): Promise<void> {
    const fileType = detectFileType(command.fileType, command.fileName);

    if (fileType === 'pdf') {
      await this.checkPdfPageCount(command.fileData, command.fileName);
    } else if (fileType === 'docx' || fileType === 'pptx') {
      this.checkFileSize(command.fileData, command.fileName);
    }

    // TXT, MD, CSV, XLSX — always fast, no preflight needed
  }

  private async checkPdfPageCount(
    fileData: Buffer,
    fileName: string,
  ): Promise<void> {
    const maxPages = this.config.chatUploadMaxPdfPages;

    try {
      // pdf-parse reads metadata including page count without full text extraction
      const pdf = await PdfParse(fileData, {
        // Only read first page to get metadata quickly
        max: 1,
      });
      const pageCount = pdf.numpages;

      if (pageCount > maxPages) {
        this.logger.warn(
          `PDF "${fileName}" has ${pageCount} pages (max: ${maxPages})`,
        );
        throw new DocumentTooLargeForChatError({
          fileName,
          pageCount,
          maxPages,
        });
      }
    } catch (error) {
      if (error instanceof DocumentTooLargeForChatError) {
        throw error;
      }
      // If pdf-parse fails to read metadata, let it through — the actual
      // processing step will handle or fail on the content itself
      this.logger.warn(
        `Could not read PDF metadata for preflight: ${(error as Error).message}`,
      );
    }
  }

  private checkFileSize(fileData: Buffer, fileName: string): void {
    const maxSizeMb = this.config.chatUploadMaxFileSizeMb;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    const fileSize = Buffer.byteLength(fileData);

    if (fileSize > maxSizeBytes) {
      this.logger.warn(
        `File "${fileName}" is ${(fileSize / (1024 * 1024)).toFixed(1)}MB (max: ${maxSizeMb}MB)`,
      );
      throw new DocumentTooLargeForChatError({
        fileName,
        fileSizeMb: Math.ceil(fileSize / (1024 * 1024)),
        maxSizeMb,
      });
    }
  }
}
