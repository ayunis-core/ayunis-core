import { FileRetrieverHandler } from '../../application/ports/file-retriever.handler';
import { FileRetrieverResult } from '../../domain/file-retriever-result.entity';
import { FileRetrieverPage } from '../../domain/file-retriever-result.entity';
import { File } from '../../domain/file.entity';
import PdfParse from 'pdf-parse';

export class NpmPdfParseFileRetrieverHandler extends FileRetrieverHandler {
  async processFile(file: File): Promise<FileRetrieverResult> {
    const pdf = await PdfParse(file.fileData);
    return new FileRetrieverResult([new FileRetrieverPage(pdf.text, 1)]);
  }
}
