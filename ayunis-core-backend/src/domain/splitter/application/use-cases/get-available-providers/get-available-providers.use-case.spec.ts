import { Test, TestingModule } from '@nestjs/testing';
import { GetAvailableProvidersUseCase } from './get-available-providers.use-case';
import { GetAvailableProvidersQuery } from './get-available-providers.query';
import { SplitterProviderRegistry } from '../../splitter-provider.registry';
import { SplitterProvider } from '../../../domain/splitter-provider.enum';

describe('GetAvailableProvidersUseCase', () => {
  let useCase: GetAvailableProvidersUseCase;
  let mockProviderRegistry: Partial<SplitterProviderRegistry>;

  beforeEach(async () => {
    mockProviderRegistry = {
      getAvailableProviders: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAvailableProvidersUseCase,
        {
          provide: SplitterProviderRegistry,
          useValue: mockProviderRegistry,
        },
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
      const expectedProviders = [
        SplitterProvider.RECURSIVE,
        SplitterProvider.LINE,
      ];

      jest
        .spyOn(mockProviderRegistry, 'getAvailableProviders')
        .mockReturnValue(expectedProviders);

      const query = new GetAvailableProvidersQuery();
      const result = useCase.execute(query);

      expect(mockProviderRegistry.getAvailableProviders).toHaveBeenCalled();
      expect(result).toEqual(expectedProviders);
    });

    it('should return empty array when no providers available', () => {
      const expectedProviders: SplitterProvider[] = [];

      jest
        .spyOn(mockProviderRegistry, 'getAvailableProviders')
        .mockReturnValue(expectedProviders);

      const query = new GetAvailableProvidersQuery();
      const result = useCase.execute(query);

      expect(mockProviderRegistry.getAvailableProviders).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle single provider', () => {
      const expectedProviders = [SplitterProvider.RECURSIVE];

      jest
        .spyOn(mockProviderRegistry, 'getAvailableProviders')
        .mockReturnValue(expectedProviders);

      const query = new GetAvailableProvidersQuery();
      const result = useCase.execute(query);

      expect(mockProviderRegistry.getAvailableProviders).toHaveBeenCalled();
      expect(result).toEqual(expectedProviders);
      expect(result.length).toBe(1);
    });
  });
});
