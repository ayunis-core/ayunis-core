import { Module } from '@nestjs/common';
import { PdfTextExtractorPort } from '../../application/ports/pdf-text-extractor.port';
import { PiscinaPdfTextAdapter } from './piscina-pdf-text.adapter';

// Single binding so every consumer shares one piscina pool.
@Module({
  providers: [
    {
      provide: PdfTextExtractorPort,
      useClass: PiscinaPdfTextAdapter,
    },
  ],
  exports: [PdfTextExtractorPort],
})
export class PdfTextParsingModule {}
