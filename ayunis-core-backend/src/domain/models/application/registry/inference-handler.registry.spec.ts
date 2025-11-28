import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InferenceHandlerRegistry } from './inference-handler.registry';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { InferenceHandler } from '../ports/inference.handler';
// Token not used currently; register directly in the factory below
const MISTRAL_INFERENCE_HANDLER = 'MISTRAL_INFERENCE_HANDLER';
import { MistralInferenceHandler } from '../../infrastructure/inference/mistral.inference';

describe('InferenceHandlerRegistry', () => {
  let registry: InferenceHandlerRegistry;
  let mockMistralHandler: Partial<InferenceHandler>;

  beforeEach(async () => {
    mockMistralHandler = {} as InferenceHandler;

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: MISTRAL_INFERENCE_HANDLER,
          useValue: mockMistralHandler,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: InferenceHandlerRegistry,
          useFactory: (
            mistralHandler: MistralInferenceHandler,
            configService: any,
          ) => {
            const registry = new InferenceHandlerRegistry(configService);
            registry.register(ModelProvider.MISTRAL, mistralHandler);
            return registry;
          },
          inject: [MISTRAL_INFERENCE_HANDLER, ConfigService],
        },
      ],
    }).compile();

    registry = module.get<InferenceHandlerRegistry>(InferenceHandlerRegistry);
  });

  it('should be defined', () => {
    expect(registry).toBeDefined();
  });

  describe('getHandler', () => {
    it('should retrieve the mistral handler by provider', () => {
      // Act
      const handler = registry.getHandler(ModelProvider.MISTRAL);

      // Assert
      expect(handler).toBe(mockMistralHandler);
    });

    it('should throw an error when getting a handler that is not registered', () => {
      // Act & Assert
      expect(() => registry.getHandler(ModelProvider.OPENAI)).toThrow();
    });
  });

  describe('register', () => {
    it('should allow manual registration of a handler', () => {
      // Arrange
      const mockOpenAiHandler = {} as InferenceHandler;

      // Act
      registry.register(ModelProvider.OPENAI, mockOpenAiHandler);
      const handler = registry.getHandler(ModelProvider.OPENAI);

      // Assert
      expect(handler).toBe(mockOpenAiHandler);
    });
  });
});
