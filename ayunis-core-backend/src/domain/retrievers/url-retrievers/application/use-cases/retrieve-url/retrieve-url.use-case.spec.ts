import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { RetrieveUrlUseCase } from './retrieve-url.use-case';
import { RetrieveUrlCommand } from './retrieve-url.command';
import { UrlRetrieverHandler } from '../../ports/url-retriever.handler';
import { UrlRetrieverResult } from '../../../domain/url-retriever-result.entity';
import { UrlRetrieverProviderNotAvailableError } from '../../url-retriever.errors';
import { AssertCrawlDomainAccessUseCase } from 'src/domain/crawl-domain-grants/application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.use-case';
import { CrawlDomainAccessDeniedError } from 'src/domain/crawl-domain-grants/application/crawl-domain-grants.errors';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;

describe('RetrieveUrlUseCase', () => {
  let useCase: RetrieveUrlUseCase;
  let mockHandler: Partial<UrlRetrieverHandler>;
  let mockAssertCrawlDomainAccess: Partial<AssertCrawlDomainAccessUseCase>;

  beforeAll(async () => {
    mockHandler = {
      retrieveUrl: jest.fn(),
    };
    mockAssertCrawlDomainAccess = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrieveUrlUseCase,
        { provide: UrlRetrieverHandler, useValue: mockHandler },
        {
          provide: AssertCrawlDomainAccessUseCase,
          useValue: mockAssertCrawlDomainAccess,
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
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should retrieve URL successfully', async () => {
    const command = new RetrieveUrlCommand('https://example.com', ORG_ID, {
      timeout: 5000,
    });
    const expectedResult = new UrlRetrieverResult(
      'Retrieved content',
      'https://example.com',
      'https://example.com',
    );

    jest.spyOn(mockHandler, 'retrieveUrl').mockResolvedValue(expectedResult);

    const result = await useCase.execute(command);

    expect(result).toBe(expectedResult);
    expect(mockHandler.retrieveUrl).toHaveBeenCalledWith({
      url: command.url,
      options: command.options,
      onRedirect: expect.any(Function),
    });
  });

  it('should pass an onRedirect guard that re-asserts the gate per hop', async () => {
    const command = new RetrieveUrlCommand('https://example.com', ORG_ID);
    jest
      .spyOn(mockHandler, 'retrieveUrl')
      .mockResolvedValue(
        new UrlRetrieverResult('content', command.url, command.url),
      );

    await useCase.execute(command);

    const input = (mockHandler.retrieveUrl as jest.Mock).mock.calls[0][0];
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

  it('should enforce the org crawl gate before fetching', async () => {
    const command = new RetrieveUrlCommand('https://example.com', ORG_ID);
    jest
      .spyOn(mockHandler, 'retrieveUrl')
      .mockResolvedValue(
        new UrlRetrieverResult('content', command.url, command.url),
      );

    await useCase.execute(command);

    expect(mockAssertCrawlDomainAccess.execute).toHaveBeenCalledWith(
      expect.objectContaining({ url: command.url, orgId: ORG_ID }),
    );
  });

  it('should propagate a crawl-domain access denial without fetching or masking it', async () => {
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
    expect(mockHandler.retrieveUrl).not.toHaveBeenCalled();
  });

  it('should propagate a crawl-domain access denial raised on a redirect hop without masking it', async () => {
    const command = new RetrieveUrlCommand('https://example.com', ORG_ID);
    jest
      .spyOn(mockHandler, 'retrieveUrl')
      .mockRejectedValue(new CrawlDomainAccessDeniedError());

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      CrawlDomainAccessDeniedError,
    );
  });

  it('should handle errors and convert to domain error', async () => {
    const command = new RetrieveUrlCommand('https://example.com', ORG_ID);
    const error = new Error('Network error');

    jest.spyOn(mockHandler, 'retrieveUrl').mockRejectedValue(error);

    await expect(useCase.execute(command)).rejects.toThrow(
      UrlRetrieverProviderNotAvailableError,
    );
  });
});
