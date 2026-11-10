import { BatchedPdfOcrHandler } from './application/services/batched-pdf-ocr.handler';
import { PdfOcrRequestPort } from './application/ports/file-retriever.handler';
import { PdfBatcherPort } from './application/ports/pdf-batcher.port';
import { QpdfPdfBatcherAdapter } from './infrastructure/adapters/qpdf-pdf-batcher.adapter';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MistralFileRetrieverHandler } from './infrastructure/adapters/mistral-file-retriever.handler';
import { FileRetrieverRegistry } from './application/file-retriever-handler.registry';
import { RetrieveFileContentUseCase } from './application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import { PreflightCheckUseCase } from './application/use-cases/preflight-check/preflight-check.use-case';
import { FileRetrieverType } from './domain/value-objects/file-retriever-type.enum';
import { NpmPdfParseFileRetrieverHandler } from './infrastructure/adapters/npm-pdf-parse-file-retriever.handler';
import { GotenbergConverterService } from './infrastructure/adapters/gotenberg-converter.service';
import { DocumentConverterPort } from './application/ports/document-converter.port';
import { MsgParserPort } from './application/ports/msg-parser.port';
import { PiscinaMsgParserAdapter } from './infrastructure/adapters/piscina-msg-parser.adapter';
import retrievalConfig from 'src/config/retrieval.config';
import { gotenbergConfig } from 'src/config/gotenberg.config';
import { TranscriptionsModule } from 'src/domain/transcriptions/transcriptions.module';

@Module({
  imports: [
    ConfigModule.forFeature(retrievalConfig),
    ConfigModule.forFeature(gotenbergConfig),
    TranscriptionsModule,
  ],
  providers: [
    FileRetrieverRegistry,
    MistralFileRetrieverHandler,
    BatchedPdfOcrHandler,
    { provide: PdfOcrRequestPort, useExisting: MistralFileRetrieverHandler },
    { provide: PdfBatcherPort, useClass: QpdfPdfBatcherAdapter },
    NpmPdfParseFileRetrieverHandler,
    GotenbergConverterService,
    RetrieveFileContentUseCase,
    PreflightCheckUseCase,
    {
      provide: DocumentConverterPort,
      useExisting: GotenbergConverterService,
    },
    { provide: MsgParserPort, useClass: PiscinaMsgParserAdapter },
    {
      provide: FileRetrieverRegistry,
      useFactory: (
        npmPdfParseHandler: NpmPdfParseFileRetrieverHandler,
        mistralHandler: BatchedPdfOcrHandler,
      ) => {
        const registry = new FileRetrieverRegistry();
        registry.registerHandler(
          FileRetrieverType.NPM_PDF_PARSE,
          npmPdfParseHandler,
        );
        registry.registerHandler(FileRetrieverType.MISTRAL, mistralHandler);
        return registry;
      },
      inject: [NpmPdfParseFileRetrieverHandler, BatchedPdfOcrHandler],
    },
  ],
  exports: [
    RetrieveFileContentUseCase,
    PreflightCheckUseCase,
    FileRetrieverRegistry,
  ],
})
export class FileRetrieverModule {}
