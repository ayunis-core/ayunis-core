import { Injectable } from '@nestjs/common';
import { FileRetrieverHandler } from '../../application/ports/file-retriever.handler';
import { FileRetrieverResult } from '../../domain/file-retriever-result.entity';
import { FileRetrieverPage } from '../../domain/file-retriever-result.entity';
import { PdfTextExtractorPort } from '../../application/ports/pdf-text-extractor.port';
import type { File } from '../../domain/file.entity';

@Injectable()
export class NpmPdfParseFileRetrieverHandler extends FileRetrieverHandler {
  constructor(private readonly pdfTextExtractor: PdfTextExtractorPort) {
    super();
  }

  async processFile(file: File): Promise<FileRetrieverResult> {
    const pageTexts = await this.pdfTextExtractor.extractPageTexts(
      file.fileData,
    );
    return new FileRetrieverResult(
      pageTexts.map((text, index) => new FileRetrieverPage(text, index + 1)),
    );
  }
}
