import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import retrievalConfig from 'src/config/retrieval.config';
import { ClsModule } from 'nestjs-cls';
import { PDFDocument } from 'pdf-lib';
import { ContextService } from 'src/common/context/services/context.service';
import { FileRetrieverModule } from './file-retriever.module';
import { PdfOcrRequestPort } from './application/ports/file-retriever.handler';
import { DocumentConverterPort } from './application/ports/document-converter.port';
import { RetrieveFileContentUseCase } from './application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import { RetrieveFileContentCommand } from './application/use-cases/retrieve-file-content/retrieve-file-content.command';
import {
  FileRetrieverPage,
  FileRetrieverResult,
} from './domain/file-retriever-result.entity';
import type { File } from './domain/file.entity';

describe('registered PDF processing pipeline', () => {
  let module: TestingModule;
  let pdfBytes: Buffer;
  const requestSizes: number[] = [];

  beforeAll(async () => {
    const pdf = await PDFDocument.create();
    for (let i = 0; i < 5; i++) pdf.addPage([300 + i, 400]);
    pdfBytes = Buffer.from(await pdf.save());
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              retrieval: {
                mistral: { apiKey: 'test-only' },
                ocrBatchPages: 2,
                processingMaxPdfPages: 1000,
              },
            }),
          ],
        }),
        ClsModule.forRoot({ global: true }),
        FileRetrieverModule,
      ],
    })
      .overrideProvider(retrievalConfig.KEY)
      .useValue({
        mistral: { apiKey: 'test-only' },
        processingMaxPdfPages: 1000,
        ocrBatchPages: 2,
      })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          retrieval: { mistral: { apiKey: 'test-only' }, ocrBatchPages: 2 },
        }),
      )
      .overrideProvider(ContextService)
      .useValue({ get: () => 'd6587ae0-6cb6-41f3-a934-9b85fe7c3c55' })
      .overrideProvider(DocumentConverterPort)
      .useValue({ convertToPdf: async () => pdfBytes })
      .overrideProvider(PdfOcrRequestPort)
      .useValue({
        processFile: async (file: File) => {
          const part = await PDFDocument.load(file.fileData);
          requestSizes.push(part.getPageCount());
          return new FileRetrieverResult(
            part
              .getPages()
              .map(
                (page, index) =>
                  new FileRetrieverPage(`Width ${page.getWidth()}`, index + 1),
              ),
          );
        },
      })
      .compile();
  });

  beforeEach(() => {
    requestSizes.length = 0;
  });
  afterAll(async () => {
    await module.close();
  });

  it('routes real PDFs through the batched handler registered in Nest', async () => {
    const result = await module.get(RetrieveFileContentUseCase).execute(
      new RetrieveFileContentCommand({
        fileData: pdfBytes,
        fileName: 'council.pdf',
        fileType: 'application/pdf',
      }),
    );
    expect(requestSizes).toEqual([2, 2, 1]);
    expect(result.pages.map((page) => page.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it('rejects a 1001-page original before OCR without requiring a legacy preflight count', async () => {
    const pdf = await PDFDocument.create();
    for (let index = 0; index < 1001; index++) pdf.addPage([300, 400]);
    const fileData = Buffer.from(await pdf.save());
    await expect(
      module.get(RetrieveFileContentUseCase).execute(
        new RetrieveFileContentCommand({
          fileData,
          fileName: 'too-many-pages.pdf',
          fileType: 'application/pdf',
        }),
      ),
    ).rejects.toMatchObject({ code: 'TOO_MANY_PAGES' });
    expect(requestSizes).toEqual([]);
  });

  it('routes converted Office documents through the same batched path', async () => {
    const result = await module.get(RetrieveFileContentUseCase).execute(
      new RetrieveFileContentCommand({
        fileData: Buffer.from('Office fixture'),
        fileName: 'council.docx',
        fileType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );
    expect(requestSizes).toEqual([2, 2, 1]);
    expect(result.pages[4].text).toBe('Width 304');
  });
});
