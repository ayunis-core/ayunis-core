import { Logger } from '@nestjs/common';
import { GenerateImageUseCase } from './generate-image.use-case';
import { GenerateImageCommand } from './generate-image.command';
import type { ImageGenerationHandlerRegistry } from '../../registry/image-generation-handler.registry';
import {
  ImageGenerationFailedError,
  ModelProviderNotSupportedError,
} from '../../models.errors';
import {
  ImageGenerationInput,
  ImageGenerationResult,
} from '../../ports/image-generation.handler';
import type { ImageGenerationHandler } from '../../ports/image-generation.handler';
import { ImageGenerationModel } from '../../../domain/models/image-generation.model';
import { ModelProvider } from '../../../domain/value-objects/model-provider.enum';

describe('GenerateImageUseCase', () => {
  let useCase: GenerateImageUseCase;
  let registry: jest.Mocked<ImageGenerationHandlerRegistry>;
  let handler: jest.Mocked<ImageGenerationHandler>;

  const mockModel = new ImageGenerationModel({
    name: 'gpt-image-1',
    provider: ModelProvider.AZURE,
    displayName: 'GPT Image 1',
    isArchived: false,
  });

  beforeEach(() => {
    handler = {
      generate: jest.fn(),
    };

    registry = {
      getHandler: jest.fn().mockReturnValue(handler),
      register: jest.fn(),
      registerMockHandler: jest.fn(),
    } as unknown as jest.Mocked<ImageGenerationHandlerRegistry>;

    useCase = new GenerateImageUseCase(registry);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should call the correct handler from the registry based on model provider', async () => {
      const command = new GenerateImageCommand({
        model: mockModel,
        prompt: 'a cat',
      });

      const result = new ImageGenerationResult(
        Buffer.from('fake-image'),
        'image/png',
      );
      handler.generate.mockResolvedValue(result);

      await useCase.execute(command);

      expect(registry.getHandler).toHaveBeenCalledWith(ModelProvider.AZURE);
      expect(handler.generate).toHaveBeenCalledWith(
        expect.any(ImageGenerationInput),
      );
    });

    it('should return the handler result', async () => {
      const command = new GenerateImageCommand({
        model: mockModel,
        prompt: 'a cat',
        size: '1024x1024',
        quality: 'hd',
      });

      const expectedResult = new ImageGenerationResult(
        Buffer.from('fake-image'),
        'image/png',
        'a cute cat',
      );
      handler.generate.mockResolvedValue(expectedResult);

      const result = await useCase.execute(command);

      expect(result).toBe(expectedResult);
    });

    it('should wrap non-ApplicationError exceptions in ImageGenerationFailedError', async () => {
      const command = new GenerateImageCommand({
        model: mockModel,
        prompt: 'a cat',
      });

      handler.generate.mockRejectedValue(
        new Error('getaddrinfo ENOTFOUND my-internal.azure.com'),
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        ImageGenerationFailedError,
      );
      await expect(useCase.execute(command)).rejects.toThrow(
        /unexpected error/i,
      );
      await expect(useCase.execute(command)).rejects.not.toThrow(/ENOTFOUND/);
    });

    it('should re-throw ApplicationError exceptions as-is', async () => {
      const command = new GenerateImageCommand({
        model: mockModel,
        prompt: 'a cat',
      });

      const appError = new ModelProviderNotSupportedError('azure');
      registry.getHandler.mockImplementation(() => {
        throw appError;
      });

      await expect(useCase.execute(command)).rejects.toThrow(appError);
    });
  });
});
