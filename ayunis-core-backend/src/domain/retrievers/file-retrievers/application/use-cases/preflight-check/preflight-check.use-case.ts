import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PreflightCheckCommand } from './preflight-check.command';
import { TooManyPagesError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { detectFileType } from 'src/common/util/file-type';
import retrievalConfig from 'src/config/retrieval.config';
import PdfParse from 'pdf-parse';
import { PdfBatcherPort } from 'src/domain/retrievers/file-retrievers/application/ports/pdf-batcher.port';

@Injectable()
export class PreflightCheckUseCase {
  private readonly logger = new Logger(PreflightCheckUseCase.name);

  constructor(
    @Inject(retrievalConfig.KEY)
    private readonly config: ConfigType<typeof retrievalConfig>,
    private readonly batcher: PdfBatcherPort,
  ) {}

  async execute(command: PreflightCheckCommand): Promise<void> {
    const fileType = detectFileType(command.fileType, command.fileName);
    if (fileType === 'pdf') {
      await this.checkPdfPageCount(command);
    }
    // Office documents are checked after conversion, when PDF metadata exists.
  }

  private async checkPdfPageCount(
    command: PreflightCheckCommand,
  ): Promise<void> {
    const { fileName } = command;
    const maxPages = this.config.processingMaxPdfPages;
    let pageCount: number;
    try {
      pageCount = command.localFile
        ? await this.batcher.pageCount(command.localFile)
        : await this.countInMemory(command.fileData);
    } catch (error) {
      // If the metadata cannot be read, let it through — the actual
      // processing step will handle or fail on the content itself
      this.logger.warn(
        { err: error as Error, fileName },
        'Could not read PDF metadata for preflight',
      );
      return;
    }

    if (pageCount > maxPages) {
      this.logger.warn(
        { fileName, pageCount, maxPages },
        'PDF exceeds the page limit',
      );
      throw new TooManyPagesError({ fileName, pageCount, maxPages });
    }
  }

  private async countInMemory(fileData: Buffer): Promise<number> {
    // pdf-parse reads metadata including page count without full text extraction
    const parse = PdfParse as (
      data: Uint8Array,
      options: PdfParse.Options,
    ) => Promise<PdfParse.Result>;
    // Pass a copy: PDF.js may detach the input buffer, and callers reuse fileData.
    const pdf = await parse(new Uint8Array(fileData), {
      // Only read first page to get metadata quickly
      max: 1,
    });
    return pdf.numpages;
  }
}
