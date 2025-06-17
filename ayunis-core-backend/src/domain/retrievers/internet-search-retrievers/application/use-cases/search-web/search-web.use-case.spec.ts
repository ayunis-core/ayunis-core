import { Test, TestingModule } from '@nestjs/testing';
import { SearchWebUseCase } from './search-web.use-case';
import { SearchWebCommand } from './search-web.command';
import { InternetSearchHandler } from '../../ports/internet-search.handler';
import { InternetSearchResult } from '../../../domain/internet-search-result.entity';

describe('SearchWebUseCase', () => {
  let useCase: SearchWebUseCase;
  let mockHandler: Partial<InternetSearchHandler>;

  beforeEach(async () => {
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

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should search web successfully', async () => {
    const command = new SearchWebCommand('test query');
    const expectedResults = [
      new InternetSearchResult(
        'Test Title',
        'Test snippet',
        'https://example.com',
      ),
    ];

    jest.spyOn(mockHandler, 'search').mockResolvedValue(expectedResults);

    const result = await useCase.execute(command);

    expect(result).toBe(expectedResults);
    expect(mockHandler.search).toHaveBeenCalledWith(command.query);
  });
});
