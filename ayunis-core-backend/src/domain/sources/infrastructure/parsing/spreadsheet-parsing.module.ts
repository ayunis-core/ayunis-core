import { Module } from '@nestjs/common';
import { SpreadsheetParserPort } from '../../application/ports/spreadsheet-parser.port';
import { PiscinaSpreadsheetParserAdapter } from './piscina-spreadsheet-parser.adapter';

// Single binding so every consumer shares one piscina pool.
@Module({
  providers: [
    {
      provide: SpreadsheetParserPort,
      useClass: PiscinaSpreadsheetParserAdapter,
    },
  ],
  exports: [SpreadsheetParserPort],
})
export class SpreadsheetParsingModule {}
