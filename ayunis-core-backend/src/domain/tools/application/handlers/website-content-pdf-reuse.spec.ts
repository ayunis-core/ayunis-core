import { PdfExtractionCachePort } from 'src/domain/retrievers/url-retrievers/application/ports/pdf-extraction-cache.port';
import { RequestPdfExtractionCacheService } from 'src/domain/retrievers/url-retrievers/infrastructure/cache/request-pdf-extraction-cache.service';
import { AsyncLocalStorage } from 'async_hooks';
import { Test } from '@nestjs/testing';
import {
  ContextService,
  type MyClsStore,
} from 'src/common/context/services/context.service';
import { RetrieveUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.use-case';
import { UrlRetrieverHandler } from 'src/domain/retrievers/url-retrievers/application/ports/url-retriever.handler';
import { AssertCrawlDomainAccessUseCase } from 'src/domain/crawl-domain-grants/application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.use-case';
import { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import { PreflightCheckUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.use-case';
import {
  FileRetrieverPage,
  FileRetrieverResult,
} from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import { WebsiteContentTool } from 'src/domain/tools/domain/tools/website-content-tool.entity';
import { WebsiteContentToolHandler } from './website-content-tool.handler';

const context = {
  orgId: '11111111-1111-1111-1111-111111111111',
  threadId: '22222222-2222-2222-2222-222222222222',
} as const;
const url = 'https://council.example.de/building-regulations.pdf';

describe('Website PDF pagination', () => {
  it('reads successive text pages from one extraction snapshot', async () => {
    const cls = new ContextService(new AsyncLocalStorage<MyClsStore>());
    const extract = jest
      .fn()
      .mockResolvedValueOnce(
        new FileRetrieverResult([
          new FileRetrieverPage(
            'Section one\nSection two\nSection three\nSection four',
            1,
          ),
        ]),
      )
      .mockResolvedValue(
        new FileRetrieverResult([
          new FileRetrieverPage(
            'Changed OCR\nDifferent layout\nWrong third line',
            1,
          ),
        ]),
      );
    const module = await Test.createTestingModule({
      providers: [
        RetrieveUrlUseCase,
        {
          provide: PdfExtractionCachePort,
          useClass: RequestPdfExtractionCacheService,
        },
        { provide: ContextService, useValue: cls },
        {
          provide: AssertCrawlDomainAccessUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: PreflightCheckUseCase, useValue: { execute: jest.fn() } },
        { provide: RetrieveFileContentUseCase, useValue: { execute: extract } },
        {
          provide: UrlRetrieverHandler,
          useValue: {
            fetch: jest.fn().mockResolvedValue({
              contentType: 'application/pdf',
              finalUrl: url,
              body: Buffer.from('%PDF-1.7 council regulations'),
            }),
          },
        },
      ],
    }).compile();
    const handler = new WebsiteContentToolHandler(
      module.get(RetrieveUrlUseCase),
      {
        sourceGetText: { maxLines: 200, maxChars: 5000 },
      },
    );
    const read = (startLine: number) =>
      handler.execute({
        tool: new WebsiteContentTool(),
        input: { url, startLine, numLines: 2 },
        context,
      });
    await cls.runWith(context, async () => {
      expect(JSON.parse(await read(1))).toMatchObject({
        content: 'Section one\nSection two',
      });
      expect(JSON.parse(await read(3))).toMatchObject({
        content: 'Section three\nSection four',
      });
      expect(extract).toHaveBeenCalledTimes(1);
    });
    await module.close();
  });
});
