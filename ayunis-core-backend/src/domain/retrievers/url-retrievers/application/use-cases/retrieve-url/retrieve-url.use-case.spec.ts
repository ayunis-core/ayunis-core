import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { RetrieveUrlUseCase } from './retrieve-url.use-case';
import { RetrieveUrlCommand } from './retrieve-url.command';
import type { RawUrlResponse } from '../../ports/url-retriever.handler';
import { UrlRetrieverHandler } from '../../ports/url-retriever.handler';
import { UrlRetrieverResult } from '../../../domain/url-retriever-result.entity';
import {
  UrlRetrieverProviderNotAvailableError,
  UrlRetrieverUnsupportedContentTypeError,
} from '../../url-retriever.errors';
import { AssertCrawlDomainAccessUseCase } from 'src/domain/crawl-domain-grants/application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.use-case';
import { CrawlDomainAccessDeniedError } from 'src/domain/crawl-domain-grants/application/crawl-domain-grants.errors';
import { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import {
  FileRetrieverPage,
  FileRetrieverResult,
} from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import { FileTooLargeError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;

function rawResponse(partial: Partial<RawUrlResponse>): RawUrlResponse {
  return {
    contentType: 'text/html',
    finalUrl: 'https://example.com',
    body: Buffer.from('<html><body>content</body></html>'),
    ...partial,
  };
}

describe('RetrieveUrlUseCase', () => {
  let useCase: RetrieveUrlUseCase;
  let mockHandler: { fetch: jest.Mock; parseHtml: jest.Mock };
  let mockAssertCrawlDomainAccess: Partial<AssertCrawlDomainAccessUseCase>;
  let mockRetrieveFileContent: { execute: jest.Mock };

  beforeAll(async () => {
    mockHandler = { fetch: jest.fn(), parseHtml: jest.fn() };
    mockAssertCrawlDomainAccess = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    mockRetrieveFileContent = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrieveUrlUseCase,
        { provide: UrlRetrieverHandler, useValue: mockHandler },
        {
          provide: AssertCrawlDomainAccessUseCase,
          useValue: mockAssertCrawlDomainAccess,
        },
        {
          provide: RetrieveFileContentUseCase,
          useValue: mockRetrieveFileContent,
        },
      ],
    }).compile();

    useCase = module.get<RetrieveUrlUseCase>(RetrieveUrlUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (mockAssertCrawlDomainAccess.execute as jest.Mock).mockResolvedValue(
      undefined,
    );
    mockHandler.fetch.mockResolvedValue(rawResponse({}));
    mockHandler.parseHtml.mockReturnValue(
      new UrlRetrieverResult('parsed', 'https://example.com', 'Title'),
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('parses an HTML response via the handler', async () => {
    const command = new RetrieveUrlCommand('https://example.com', ORG_ID);
    const parsed = new UrlRetrieverResult(
      'Hello world',
      'https://example.com',
      'Acme',
    );
    mockHandler.fetch.mockResolvedValue(
      rawResponse({ body: Buffer.from('<body>Hello world</body>') }),
    );
    mockHandler.parseHtml.mockReturnValue(parsed);

    const result = await useCase.execute(command);

    expect(result).toBe(parsed);
    expect(mockHandler.parseHtml).toHaveBeenCalledWith(
      '<body>Hello world</body>',
      'https://example.com',
    );
    expect(mockRetrieveFileContent.execute).not.toHaveBeenCalled();
  });

  it('passes an onRedirect guard that re-asserts the gate per hop', async () => {
    const command = new RetrieveUrlCommand('https://example.com', ORG_ID);

    await useCase.execute(command);

    const input = mockHandler.fetch.mock.calls[0][0];
    expect(typeof input.onRedirect).toBe('function');

    // Invoking the guard with a redirect target re-runs the crawl gate for it.
    await input.onRedirect('https://redirected.example.org/page');
    expect(mockAssertCrawlDomainAccess.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://redirected.example.org/page',
        orgId: ORG_ID,
      }),
    );
  });

  it('passes an assertContentType gate that rejects unsupported types before download', async () => {
    const command = new RetrieveUrlCommand('https://example.com', ORG_ID);

    await useCase.execute(command);

    const input = mockHandler.fetch.mock.calls[0][0];
    expect(typeof input.assertContentType).toBe('function');

    // PDFs and text types are accepted (routed later), so the body may download.
    expect(() =>
      input.assertContentType('text/html', 'https://example.com'),
    ).not.toThrow();
    expect(() =>
      input.assertContentType('application/pdf', 'https://acme.test/a.pdf'),
    ).not.toThrow();
    expect(() =>
      input.assertContentType(
        'application/octet-stream',
        'https://acme.test/a.pdf',
      ),
    ).not.toThrow();

    // A genuinely unsupported type is rejected from headers alone.
    expect(() =>
      input.assertContentType('image/png', 'https://acme.test/logo.png'),
    ).toThrow(UrlRetrieverUnsupportedContentTypeError);
  });

  it('decodes a non-UTF-8 (Latin-1) text response using the declared charset', async () => {
    const command = new RetrieveUrlCommand('https://acme.test/de.txt', ORG_ID);
    mockHandler.fetch.mockResolvedValue(
      rawResponse({
        contentType: 'text/plain; charset=iso-8859-1',
        finalUrl: 'https://acme.test/de.txt',
        // "Grüße aus Köln" encoded as Latin-1 — UTF-8 decoding would mangle it.
        body: Buffer.from('Grüße aus Köln', 'latin1'),
      }),
    );

    const result = await useCase.execute(command);

    expect(result.content).toBe('Grüße aus Köln');
  });

  it('decodes HTML using the declared charset before parsing', async () => {
    const command = new RetrieveUrlCommand('https://acme.test/de.html', ORG_ID);
    mockHandler.fetch.mockResolvedValue(
      rawResponse({
        contentType: 'text/html; charset=windows-1252',
        finalUrl: 'https://acme.test/de.html',
        // "Köln" with the umlaut byte 0xF6 — UTF-8 decoding would mangle it.
        body: Buffer.from('<body>Köln</body>', 'latin1'),
      }),
    );

    await useCase.execute(command);

    expect(mockHandler.parseHtml).toHaveBeenCalledWith(
      '<body>Köln</body>',
      'https://acme.test/de.html',
    );
  });

  it('returns trimmed text directly for a text/plain response', async () => {
    const command = new RetrieveUrlCommand(
      'https://example.com/robots',
      ORG_ID,
    );
    mockHandler.fetch.mockResolvedValue(
      rawResponse({
        contentType: 'text/plain; charset=utf-8',
        finalUrl: 'https://example.com/robots.txt',
        body: Buffer.from('  user-agent: *  '),
      }),
    );

    const result = await useCase.execute(command);

    expect(result.content).toBe('user-agent: *');
    expect(result.url).toBe('https://example.com/robots.txt');
    expect(mockHandler.parseHtml).not.toHaveBeenCalled();
  });

  it('delegates an application/pdf response to the file pipeline', async () => {
    const command = new RetrieveUrlCommand(
      'https://acme.test/files/report.pdf',
      ORG_ID,
    );
    mockHandler.fetch.mockResolvedValue(
      rawResponse({
        contentType: 'application/pdf',
        finalUrl: 'https://acme.test/files/report.pdf',
        body: Buffer.from('%PDF-1.7 binary'),
      }),
    );
    mockRetrieveFileContent.execute.mockResolvedValue(
      new FileRetrieverResult(
        [
          new FileRetrieverPage('Budget report 2026', 1),
          new FileRetrieverPage('Appendix A', 2),
        ],
        { model: 'mistral-ocr-latest' },
      ),
    );

    const result = await useCase.execute(command);

    expect(result.content).toBe('Budget report 2026\n\nAppendix A');
    expect(result.websiteTitle).toBe('report.pdf');
    expect(result.metadata).toEqual({ model: 'mistral-ocr-latest' });
    expect(result.links).toEqual([]);
    expect(mockRetrieveFileContent.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'report.pdf',
        fileType: 'application/pdf',
      }),
    );
    expect(mockHandler.parseHtml).not.toHaveBeenCalled();
  });

  it('treats an octet-stream .pdf URL as a PDF', async () => {
    const command = new RetrieveUrlCommand(
      'https://acme.test/a/handbook.pdf',
      ORG_ID,
    );
    mockHandler.fetch.mockResolvedValue(
      rawResponse({
        contentType: 'application/octet-stream',
        finalUrl: 'https://acme.test/a/handbook.pdf',
        body: Buffer.from('%PDF-1.4 binary'),
      }),
    );
    mockRetrieveFileContent.execute.mockResolvedValue(
      new FileRetrieverResult([new FileRetrieverPage('Handbook', 1)]),
    );

    await useCase.execute(command);

    expect(mockRetrieveFileContent.execute).toHaveBeenCalledTimes(1);
  });

  it('rejects a genuinely unsupported content type', async () => {
    const command = new RetrieveUrlCommand(
      'https://acme.test/logo.png',
      ORG_ID,
    );
    mockHandler.fetch.mockResolvedValue(
      rawResponse({
        contentType: 'image/png',
        finalUrl: 'https://acme.test/logo.png',
      }),
    );

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      UrlRetrieverUnsupportedContentTypeError,
    );
    expect(mockRetrieveFileContent.execute).not.toHaveBeenCalled();
    expect(mockHandler.parseHtml).not.toHaveBeenCalled();
  });

  it('enforces the org crawl gate before fetching', async () => {
    const command = new RetrieveUrlCommand('https://example.com', ORG_ID);

    await useCase.execute(command);

    expect(mockAssertCrawlDomainAccess.execute).toHaveBeenCalledWith(
      expect.objectContaining({ url: command.url, orgId: ORG_ID }),
    );
  });

  it('propagates a crawl-domain access denial without fetching or masking it', async () => {
    const command = new RetrieveUrlCommand(
      'https://intranet.customer.de',
      ORG_ID,
    );
    (mockAssertCrawlDomainAccess.execute as jest.Mock).mockRejectedValue(
      new CrawlDomainAccessDeniedError(),
    );

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      CrawlDomainAccessDeniedError,
    );
    expect(mockHandler.fetch).not.toHaveBeenCalled();
  });

  it('propagates a crawl-domain access denial raised on a redirect hop without masking it', async () => {
    const command = new RetrieveUrlCommand('https://example.com', ORG_ID);
    mockHandler.fetch.mockRejectedValue(new CrawlDomainAccessDeniedError());

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      CrawlDomainAccessDeniedError,
    );
  });

  it('converts a non-domain fetch error into a provider error', async () => {
    const command = new RetrieveUrlCommand('https://example.com', ORG_ID);
    mockHandler.fetch.mockRejectedValue(new Error('Network error'));

    await expect(useCase.execute(command)).rejects.toThrow(
      UrlRetrieverProviderNotAvailableError,
    );
  });

  it('preserves a file-pipeline error from PDF parsing instead of masking it as a provider error', async () => {
    const command = new RetrieveUrlCommand(
      'https://acme.test/huge.pdf',
      ORG_ID,
    );
    mockHandler.fetch.mockResolvedValue(
      rawResponse({
        contentType: 'application/pdf',
        finalUrl: 'https://acme.test/huge.pdf',
        body: Buffer.from('%PDF-1.7 binary'),
      }),
    );
    // The file pipeline rejects an oversized PDF with its own 413 domain error.
    mockRetrieveFileContent.execute.mockRejectedValue(new FileTooLargeError());

    // The error must surface with its own code/status, not be flattened to a 500.
    const error = await useCase.execute(command).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FileTooLargeError);
    expect((error as FileTooLargeError).statusCode).toBe(413);
  });
});
