import type { PinoLogger } from 'nestjs-pino';
import { getLoggerToken } from 'nestjs-pino';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { SearchWebUseCase } from './search-web.use-case';
import { SearchWebCommand } from './search-web.command';
import { InternetSearchHandler } from '../../ports/internet-search.handler';
import { InternetSearchResult } from 'src/domain/retrievers/internet-search-retrievers/domain/internet-search-result.entity';
import { InternetSearchResultType } from 'src/domain/retrievers/internet-search-retrievers/domain/value-objects/internet-search-result-type.enum';

describe('SearchWebUseCase', () => {
  let logger: jest.Mocked<PinoLogger>;
  let useCase: SearchWebUseCase;
  let mockHandler: Partial<InternetSearchHandler>;

  beforeAll(async () => {
    logger = createPinoLoggerMock();
    mockHandler = {
      search: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchWebUseCase,
        { provide: InternetSearchHandler, useValue: mockHandler },
        {
          provide: getLoggerToken(SearchWebUseCase.name),
          useValue: logger,
        },
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
    expect(mockHandler.search).toHaveBeenCalledWith(command.query);
    expect(logger.debug).toHaveBeenCalledWith(
      { input: command.query },
      'Searching web',
    );
  });
});
