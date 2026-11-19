import { Module } from '@nestjs/common';
import { DocumentExportPort } from './application/ports/document-export.port';
import { RenderLetterheadSampleUseCase } from './application/use-cases/render-letterhead-sample/render-letterhead-sample.use-case';
import { HtmlDocumentExportService } from './infrastructure/export/html-document-export.service';
import { PdfLetterheadCompositor } from './infrastructure/export/pdf-letterhead-compositor';

@Module({
  providers: [
    { provide: DocumentExportPort, useClass: HtmlDocumentExportService },
    PdfLetterheadCompositor,
    RenderLetterheadSampleUseCase,
  ],
  exports: [DocumentExportPort, RenderLetterheadSampleUseCase],
})
export class DocumentExportModule {}
