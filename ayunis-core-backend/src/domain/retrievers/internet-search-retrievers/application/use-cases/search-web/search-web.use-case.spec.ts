import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import {
  createLoggerMock,
  type LoggerMock,
} from 'src/common/testing/logger.mock';
import { SearchWebUseCase } from './search-web.use-case';
import { SearchWebCommand } from './search-web.command';
import { InternetSearchHandler } from 'src/domain/retrievers/internet-search-retrievers/application/ports/internet-search.handler';
import { InternetSearchResult } from 'src/domain/retrievers/internet-search-retrievers/domain/internet-search-result.entity';
import { InternetSearchResultType } from 'src/domain/retrievers/internet-search-retrievers/domain/value-objects/internet-search-result-type.enum';
import { AllowedDomains } from 'src/domain/retrievers/url-retrievers/domain/allowed-domains';

function aResult(url: string): InternetSearchResult {
  return new InternetSearchResult({
    title: 'Gesetz- und Verordnungsblatt',
    description: 'Verkündungen',
    url,
    type: InternetSearchResultType.WEB,
  });
}

describe('SearchWebUseCase', () => {
  let logger: LoggerMock;
  let useCase: SearchWebUseCase;
  let mockHandler: Partial<InternetSearchHandler>;

  beforeAll(async () => {
    logger = createLoggerMock();
    mockHandler = {
      search: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchWebUseCase,
        { provide: InternetSearchHandler, useValue: mockHandler },
      ],
    }).compile();

    useCase = module.get<SearchWebUseCase>(SearchWebUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should search web successfully', async () => {
    const command = new SearchWebCommand('test query');
    const expectedResults = [
      new InternetSearchResult({
        title: 'Test Title',
        description: 'Test snippet',
        url: 'https://example.com',
        type: InternetSearchResultType.WEB,
      }),
    ];

    jest.spyOn(mockHandler, 'search').mockResolvedValue(expectedResults);

    const result = await useCase.execute(command);

    expect(result).toBe(expectedResults);
    expect(mockHandler.search).toHaveBeenCalledWith(command.query, undefined);
    expect(logger.debug).toHaveBeenCalledWith(
      { input: command.query },
      'Searching web',
    );
  });

  it('passes the caller abort signal to the search provider', async () => {
    const controller = new AbortController();
    jest.spyOn(mockHandler, 'search').mockResolvedValue([]);

    await useCase.execute(
      new SearchWebCommand('Abfallkalender Musterstadt', controller.signal),
    );

    expect(mockHandler.search).toHaveBeenCalledWith(
      'Abfallkalender Musterstadt',
      controller.signal,
    );
  });

  describe('with allowed domains', () => {
    const allowedDomains = new AllowedDomains(['nrw.de', 'bund.de']);

    it('restricts the provider search to the allowed domains', async () => {
      jest.spyOn(mockHandler, 'search').mockResolvedValue([]);

      await useCase.execute(
        new SearchWebCommand('Gesetzblatt 2026', undefined, allowedDomains),
      );

      expect(mockHandler.search).toHaveBeenCalledWith(
        'Gesetzblatt 2026',
        undefined,
        ['nrw.de', 'bund.de'],
      );
    });

    it('drops results outside the allowed domains, whatever the provider returns', async () => {
      jest
        .spyOn(mockHandler, 'search')
        .mockResolvedValue([
          aResult('https://recht.nrw.de/gv/2026'),
          aResult('https://evilnrw.de/gv'),
          aResult('https://nrw.de.evil.example.com/gv'),
          aResult('https://www.recht.bund.de/bgbl'),
          aResult('not a url'),
        ]);

      const results = await useCase.execute(
        new SearchWebCommand('Gesetzblatt 2026', undefined, allowedDomains),
      );

      expect(results.map((result) => result.url)).toEqual([
        'https://recht.nrw.de/gv/2026',
        'https://www.recht.bund.de/bgbl',
      ]);
    });
  });
});
