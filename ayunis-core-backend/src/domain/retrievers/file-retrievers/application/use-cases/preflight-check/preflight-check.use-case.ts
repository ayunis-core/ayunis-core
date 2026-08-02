import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PreflightCheckCommand } from './preflight-check.command';
import { TooManyPagesError } from '../../file-retriever.errors';
import { PdfTextExtractorPort } from '../../ports/pdf-text-extractor.port';
import { detectFileType } from 'src/common/util/file-type';
import retrievalConfig from 'src/config/retrieval.config';

@Injectable()
export class PreflightCheckUseCase {
  private readonly logger = new Logger(PreflightCheckUseCase.name);

  constructor(
    @Inject(retrievalConfig.KEY)
    private readonly config: ConfigType<typeof retrievalConfig>,
    private readonly pdfTextExtractor: PdfTextExtractorPort,
  ) {}

  async execute(command: PreflightCheckCommand): Promise<void> {
    const fileType = detectFileType(command.fileType, command.fileName);

    if (fileType === 'pdf') {
      await this.checkPdfPageCount(command.fileData, command.fileName);
    }
    // Other types are either cheap to process or converted to PDF later —
    // the OCR page cap on direct PDF uploads is the only provider-imposed
    // hard limit we can check upfront.
  }

  private async checkPdfPageCount(
    fileData: Buffer,
    fileName: string,
  ): Promise<void> {
    const maxPages = this.config.processingMaxPdfPages;

    let pageCount: number;
    try {
      pageCount = await this.pdfTextExtractor.countPages(fileData);
    } catch (error) {
      // If the metadata read fails, let it through — the actual processing
      // step will handle or fail on the content itself
      this.logger.warn(
        `Could not read PDF metadata for preflight: ${(error as Error).message}`,
      );
      return;
    }

    if (pageCount > maxPages) {
      this.logger.warn(
        `PDF "${fileName}" has ${pageCount} pages (max: ${maxPages})`,
      );
      throw new TooManyPagesError({ fileName, pageCount, maxPages });
    }
  }
}
