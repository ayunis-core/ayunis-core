import type { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ImageGenerationHandlerRegistry } from './image-generation-handler.registry';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { ModelProviderNotSupportedError } from '../models.errors';
import type { ImageGenerationHandler } from '../ports/image-generation.handler';

describe('ImageGenerationHandlerRegistry', () => {
  let registry: ImageGenerationHandlerRegistry;
  let configService: jest.Mocked<ConfigService>;

  const mockHandler: jest.Mocked<ImageGenerationHandler> = {
    generate: jest.fn(),
  };

  const mockHandler2: jest.Mocked<ImageGenerationHandler> = {
    generate: jest.fn(),
  };

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    registry = new ImageGenerationHandlerRegistry(configService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHandler', () => {
    it('should return the registered handler for a provider', () => {
      configService.get.mockReturnValue(false);
      registry.register(ModelProvider.AZURE, mockHandler);

      const result = registry.getHandler(ModelProvider.AZURE);

      expect(result).toBe(mockHandler);
    });

    it('should throw ModelProviderNotSupportedError for unregistered provider', () => {
      configService.get.mockReturnValue(false);

      expect(() => registry.getHandler(ModelProvider.OPENAI)).toThrow(
        ModelProviderNotSupportedError,
      );
    });

    it('should return mock handler when app.isTest is true', () => {
      configService.get.mockReturnValue(true);
      registry.registerMockHandler(mockHandler);

      const result = registry.getHandler(ModelProvider.AZURE);

      expect(result).toBe(mockHandler);
    });

    it('should throw descriptive error when mock handler not registered in test env', () => {
      configService.get.mockReturnValue(true);

      expect(() => registry.getHandler(ModelProvider.AZURE)).toThrow(
        'Mock image generation handler not registered',
      );
    });

    it('should return different handlers for different providers', () => {
      configService.get.mockReturnValue(false);
      registry.register(ModelProvider.AZURE, mockHandler);
      registry.register(ModelProvider.OPENAI, mockHandler2);

      expect(registry.getHandler(ModelProvider.AZURE)).toBe(mockHandler);
      expect(registry.getHandler(ModelProvider.OPENAI)).toBe(mockHandler2);
    });
  });
});
