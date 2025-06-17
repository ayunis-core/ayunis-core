import { Test, TestingModule } from '@nestjs/testing';
import { RetrieveUrlUseCase } from './retrieve-url.use-case';
import { RetrieveUrlCommand } from './retrieve-url.command';
import { UrlRetrieverHandler } from '../../ports/url-retriever.handler';
import { UrlRetrieverResult } from '../../../domain/url-retriever-result.entity';
import { UrlRetrieverProviderNotAvailableError } from '../../url-retriever.errors';

describe('RetrieveUrlUseCase', () => {
  let useCase: RetrieveUrlUseCase;
  let mockHandler: Partial<UrlRetrieverHandler>;

  beforeEach(async () => {
    mockHandler = {
      retrieveUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrieveUrlUseCase,
        { provide: UrlRetrieverHandler, useValue: mockHandler },
      ],
    }).compile();

    useCase = module.get<RetrieveUrlUseCase>(RetrieveUrlUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should retrieve URL successfully', async () => {
    const command = new RetrieveUrlCommand('https://example.com', {
      timeout: 5000,
    });
    const expectedResult = new UrlRetrieverResult(
      'Retrieved content',
      'https://example.com',
      {},
    );

    jest.spyOn(mockHandler, 'retrieveUrl').mockResolvedValue(expectedResult);

    const result = await useCase.execute(command);

    expect(result).toBe(expectedResult);
    expect(mockHandler.retrieveUrl).toHaveBeenCalledWith({
      url: command.url,
      options: command.options,
    });
  });

  it('should handle errors and convert to domain error', async () => {
    const command = new RetrieveUrlCommand('https://example.com');
    const error = new Error('Network error');

    jest.spyOn(mockHandler, 'retrieveUrl').mockRejectedValue(error);

    await expect(useCase.execute(command)).rejects.toThrow(
      UrlRetrieverProviderNotAvailableError,
    );
  });
});
