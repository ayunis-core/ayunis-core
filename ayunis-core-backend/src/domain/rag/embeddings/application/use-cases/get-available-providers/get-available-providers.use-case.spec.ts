import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetAvailableProvidersUseCase } from './get-available-providers.use-case';
import { EmbeddingsHandlerRegistry } from '../../embeddings-handler.registry';
import { GetAvailableProvidersQuery } from './get-available-providers.query';
import { EmbeddingsProvider } from '../../../domain/embeddings-provider.enum';

describe('GetAvailableProvidersUseCase', () => {
  let useCase: GetAvailableProvidersUseCase;
  let mockProviderRegistry: Partial<EmbeddingsHandlerRegistry>;

  beforeEach(async () => {
    mockProviderRegistry = {
      getHandler: jest.fn(),
      getAvailableProviders: jest.fn(),
      registerHandler: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAvailableProvidersUseCase,
        { provide: EmbeddingsHandlerRegistry, useValue: mockProviderRegistry },
      ],
    }).compile();

    useCase = module.get<GetAvailableProvidersUseCase>(
      GetAvailableProvidersUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should return available providers successfully', () => {
      // Arrange
      const query = new GetAvailableProvidersQuery();
      const expectedProviders = [EmbeddingsProvider.OPENAI];

      jest
        .spyOn(mockProviderRegistry, 'getAvailableProviders')
        .mockReturnValue(expectedProviders);

      // Act
      const result = useCase.execute(query);

      // Assert
      expect(mockProviderRegistry.getAvailableProviders).toHaveBeenCalledWith();
      expect(result).toBe(expectedProviders);
    });

    it('should return empty array when no providers are available', () => {
      // Arrange
      const query = new GetAvailableProvidersQuery();
      const expectedProviders: EmbeddingsProvider[] = [];

      jest
        .spyOn(mockProviderRegistry, 'getAvailableProviders')
        .mockReturnValue(expectedProviders);

      // Act
      const result = useCase.execute(query);

      // Assert
      expect(mockProviderRegistry.getAvailableProviders).toHaveBeenCalledWith();
      expect(result).toEqual([]);
    });

    it('should return multiple providers when available', () => {
      // Arrange
      const query = new GetAvailableProvidersQuery();
      const expectedProviders = [
        EmbeddingsProvider.OPENAI,
        // Add other providers when they become available
      ];

      jest
        .spyOn(mockProviderRegistry, 'getAvailableProviders')
        .mockReturnValue(expectedProviders);

      // Act
      const result = useCase.execute(query);

      // Assert
      expect(mockProviderRegistry.getAvailableProviders).toHaveBeenCalledWith();
      expect(result).toBe(expectedProviders);
      expect(result).toHaveLength(1); // Currently only OpenAI is available
    });

    it('should handle registry errors', () => {
      // Arrange
      const query = new GetAvailableProvidersQuery();
      const registryError = new Error('Registry error');

      jest
        .spyOn(mockProviderRegistry, 'getAvailableProviders')
        .mockImplementation(() => {
          throw registryError;
        });

      // Act & Assert
      expect(() => useCase.execute(query)).toThrow('Registry error');
      expect(mockProviderRegistry.getAvailableProviders).toHaveBeenCalledWith();
    });
  });
});
