import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { AzureImageGenerationHandler } from './azure.image-generation';
import {
  ImageGenerationInput,
  ImageGenerationResult,
} from '../../application/ports/image-generation.handler';
import { ImageGenerationFailedError } from '../../application/models.errors';
import { ImageGenerationModel } from '../../domain/models/image-generation.model';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { APIError } from 'openai';

// Mock the AzureOpenAI class
const mockImagesGenerate = jest.fn();
jest.mock('openai', () => {
  const actual = jest.requireActual('openai');
  return {
    ...actual,
    AzureOpenAI: jest.fn().mockImplementation(() => ({
      images: { generate: mockImagesGenerate },
    })),
  };
});

describe('AzureImageGenerationHandler', () => {
  let handler: AzureImageGenerationHandler;
  let configService: jest.Mocked<ConfigService>;

  const mockModel = new ImageGenerationModel({
    name: 'gpt-image-1',
    provider: ModelProvider.AZURE,
    displayName: 'GPT Image 1',
    isArchived: false,
  });

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue('mock-value'),
    } as unknown as jest.Mocked<ConfigService>;

    handler = new AzureImageGenerationHandler(configService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    mockImagesGenerate.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createInput = (
    overrides: Partial<{ prompt: string; size: string; quality: string }> = {},
  ): ImageGenerationInput =>
    new ImageGenerationInput({
      model: mockModel,
      prompt: overrides.prompt ?? 'a beautiful sunset',
      size: overrides.size,
      quality: overrides.quality,
    });

  describe('generate', () => {
    it('should successfully generate an image', async () => {
      const fakeB64 = Buffer.from('fake-image-data').toString('base64');
      mockImagesGenerate.mockResolvedValue({
        data: [{ b64_json: fakeB64, revised_prompt: 'a vivid sunset' }],
      });

      const input = createInput();
      const result = await handler.generate(input);

      expect(result).toBeInstanceOf(ImageGenerationResult);
      expect(result.contentType).toBe('image/png');
      expect(result.revisedPrompt).toBe('a vivid sunset');
      expect(result.imageData).toEqual(Buffer.from(fakeB64, 'base64'));
    });

    it('should throw ImageGenerationFailedError when no image data returned', async () => {
      mockImagesGenerate.mockResolvedValue({
        data: [{ b64_json: null }],
      });

      const input = createInput();

      await expect(handler.generate(input)).rejects.toThrow(
        ImageGenerationFailedError,
      );
      await expect(handler.generate(input)).rejects.toThrow(
        'No image data returned',
      );
    });

    it('should throw ImageGenerationFailedError with content policy message on content_policy_violation', async () => {
      const apiError = APIError.generate(
        400,
        {
          error: {
            message: 'content policy violation',
            code: 'content_policy_violation',
          },
        },
        'content policy violation',
        {},
      );

      mockImagesGenerate.mockRejectedValue(apiError);

      const input = createInput();

      await expect(handler.generate(input)).rejects.toThrow(
        ImageGenerationFailedError,
      );
      await expect(handler.generate(input)).rejects.toThrow('content policy');
    });

    it('should throw ImageGenerationFailedError with generic message on other API errors', async () => {
      const apiError = APIError.generate(
        500,
        { error: { message: 'server error', code: 'server_error' } },
        'server error',
        {},
      );

      mockImagesGenerate.mockRejectedValue(apiError);

      const input = createInput();

      await expect(handler.generate(input)).rejects.toThrow(
        ImageGenerationFailedError,
      );
      await expect(handler.generate(input)).rejects.toThrow('service error');
    });

    it('should throw ImageGenerationFailedError on invalid size', async () => {
      const input = createInput({ size: '512x512' });

      await expect(handler.generate(input)).rejects.toThrow(
        ImageGenerationFailedError,
      );
      await expect(
        handler.generate(createInput({ size: '512x512' })),
      ).rejects.toThrow("Unsupported image size '512x512'");
    });

    it('should throw ImageGenerationFailedError on invalid quality', async () => {
      const input = createInput({ quality: 'ultra' });

      await expect(handler.generate(input)).rejects.toThrow(
        ImageGenerationFailedError,
      );
      await expect(
        handler.generate(createInput({ quality: 'ultra' })),
      ).rejects.toThrow("Unsupported image quality 'ultra'");
    });

    it('should default to 1024x1024 and auto when not provided', async () => {
      const fakeB64 = Buffer.from('fake-image-data').toString('base64');
      mockImagesGenerate.mockResolvedValue({
        data: [{ b64_json: fakeB64 }],
      });

      const input = createInput();
      await handler.generate(input);

      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          size: '1024x1024',
          quality: 'auto',
        }),
      );
    });

    it('should throw ImageGenerationFailedError on unexpected errors', async () => {
      mockImagesGenerate.mockRejectedValue(new TypeError('unexpected'));

      const input = createInput();

      await expect(handler.generate(input)).rejects.toThrow(
        ImageGenerationFailedError,
      );
    });
  });
});
