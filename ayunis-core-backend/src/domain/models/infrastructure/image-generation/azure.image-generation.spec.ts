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
import { APIError, AzureOpenAI } from 'openai';

// Mock the AzureOpenAI class
const mockImagesGenerate = jest.fn();
const mockImagesEdit = jest.fn();
jest.mock('openai', () => {
  const actual = jest.requireActual('openai');
  return {
    ...actual,
    AzureOpenAI: jest.fn().mockImplementation(() => ({
      images: { generate: mockImagesGenerate, edit: mockImagesEdit },
    })),
  };
});

const mockAzureOpenAICtor = jest.mocked(AzureOpenAI);

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
    mockImagesEdit.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createInput = (
    overrides: Partial<{
      prompt: string;
      size: string;
      quality: string;
      referenceImages: Array<{ data: Buffer; contentType: string }>;
    }> = {},
  ): ImageGenerationInput =>
    new ImageGenerationInput({
      model: mockModel,
      prompt: overrides.prompt ?? 'a beautiful sunset',
      size: overrides.size,
      quality: overrides.quality,
      referenceImages: overrides.referenceImages,
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

    it('should default to auto size and auto quality when not provided', async () => {
      const fakeB64 = Buffer.from('fake-image-data').toString('base64');
      mockImagesGenerate.mockResolvedValue({
        data: [{ b64_json: fakeB64 }],
      });

      const input = createInput();
      await handler.generate(input);

      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 'auto',
          quality: 'auto',
        }),
      );
    });

    it.each([
      ['square', '1024x1024'],
      ['landscape', '1536x1024'],
      ['portrait', '1024x1536'],
      ['auto', 'auto'],
    ])(
      'should map semantic size %s to provider size %s',
      async (semantic, expected) => {
        const fakeB64 = Buffer.from('fake-image-data').toString('base64');
        mockImagesGenerate.mockResolvedValue({
          data: [{ b64_json: fakeB64 }],
        });

        await handler.generate(createInput({ size: semantic }));

        expect(mockImagesGenerate).toHaveBeenCalledWith(
          expect.objectContaining({ size: expected }),
        );
      },
    );

    it('should still accept raw provider dimensions', async () => {
      const fakeB64 = Buffer.from('fake-image-data').toString('base64');
      mockImagesGenerate.mockResolvedValue({
        data: [{ b64_json: fakeB64 }],
      });

      await handler.generate(createInput({ size: '1536x1024' }));

      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ size: '1536x1024' }),
      );
    });

    it('should throw ImageGenerationFailedError on unexpected errors', async () => {
      mockImagesGenerate.mockRejectedValue(new TypeError('unexpected'));

      const input = createInput();

      await expect(handler.generate(input)).rejects.toThrow(
        ImageGenerationFailedError,
      );
    });

    it('should surface token usage from the Azure response when present', async () => {
      const fakeB64 = Buffer.from('fake-image-data').toString('base64');
      mockImagesGenerate.mockResolvedValue({
        data: [{ b64_json: fakeB64 }],
        usage: {
          input_tokens: 120,
          output_tokens: 4096,
          total_tokens: 4216,
          input_tokens_details: { text_tokens: 100, image_tokens: 20 },
        },
      });

      const result = await handler.generate(createInput());

      expect(result.usage).toEqual({
        inputTokens: 120,
        outputTokens: 4096,
        totalTokens: 4216,
      });
    });

    it('should call the edit endpoint when reference images are provided', async () => {
      const fakeB64 = Buffer.from('edited-image-data').toString('base64');
      mockImagesEdit.mockResolvedValue({
        data: [{ b64_json: fakeB64 }],
      });

      const result = await handler.generate(
        createInput({
          prompt: 'Recreate this coat of arms as a clean vector graphic',
          referenceImages: [
            { data: Buffer.from('uploaded-scan'), contentType: 'image/png' },
            { data: Buffer.from('uploaded-photo'), contentType: 'image/jpeg' },
          ],
        }),
      );

      expect(mockImagesGenerate).not.toHaveBeenCalled();
      expect(mockImagesEdit).toHaveBeenCalledTimes(1);
      const editParams = mockImagesEdit.mock.calls[0][0] as {
        model: string;
        prompt: string;
        image: unknown[];
        size: string;
        quality: string;
        n: number;
      };
      expect(editParams.model).toBe('gpt-image-1');
      expect(editParams.prompt).toBe(
        'Recreate this coat of arms as a clean vector graphic',
      );
      expect(editParams.image).toHaveLength(2);
      expect(editParams.size).toBe('auto');
      expect(editParams.quality).toBe('auto');
      expect(editParams.n).toBe(1);
      expect(result.imageData).toEqual(Buffer.from(fakeB64, 'base64'));
    });

    it('should wrap reference buffers as files matching their content type', async () => {
      const fakeB64 = Buffer.from('edited-image-data').toString('base64');
      mockImagesEdit.mockResolvedValue({
        data: [{ b64_json: fakeB64 }],
      });

      await handler.generate(
        createInput({
          referenceImages: [
            { data: Buffer.from('uploaded-photo'), contentType: 'image/jpeg' },
          ],
        }),
      );

      const editParams = mockImagesEdit.mock.calls[0][0] as {
        image: Array<{ name: string; type: string }>;
      };
      expect(editParams.image[0].name).toBe('reference-0.jpg');
      expect(editParams.image[0].type).toBe('image/jpeg');
    });

    // gpt-image-1 and gpt-image-1.5 default input_fidelity to 'low', which
    // drops the fine detail (logos, scans) reference images exist to
    // preserve. gpt-image-1-mini rejects the param outright; gpt-image-2+
    // always processes inputs at high fidelity and is not sent the param.
    it.each([
      ['gpt-image-1', 'high'],
      ['gpt-image-1.5', 'high'],
      ['gpt-image-1-mini', undefined],
      ['gpt-image-2', undefined],
      ['dall-e-2', undefined],
    ])(
      'should send input_fidelity %s -> %s for reference-image edits',
      async (modelName, expectedFidelity) => {
        const fakeB64 = Buffer.from('edited-image-data').toString('base64');
        mockImagesEdit.mockResolvedValue({
          data: [{ b64_json: fakeB64 }],
        });

        const model = new ImageGenerationModel({
          name: modelName,
          provider: ModelProvider.AZURE,
          displayName: modelName,
          isArchived: false,
        });
        await handler.generate(
          new ImageGenerationInput({
            model,
            prompt: 'a beautiful sunset',
            referenceImages: [
              { data: Buffer.from('uploaded-scan'), contentType: 'image/png' },
            ],
          }),
        );

        const editParams = mockImagesEdit.mock.calls[0][0] as Record<
          string,
          unknown
        >;
        if (expectedFidelity) {
          expect(editParams.input_fidelity).toBe(expectedFidelity);
        } else {
          expect(editParams).not.toHaveProperty('input_fidelity');
        }
      },
    );

    it('should use the generate endpoint when reference images are empty', async () => {
      const fakeB64 = Buffer.from('fake-image-data').toString('base64');
      mockImagesGenerate.mockResolvedValue({
        data: [{ b64_json: fakeB64 }],
      });

      await handler.generate(createInput({ referenceImages: [] }));

      expect(mockImagesEdit).not.toHaveBeenCalled();
      expect(mockImagesGenerate).toHaveBeenCalledTimes(1);
    });

    it('should leave usage undefined when Azure omits it (e.g. DALL-E)', async () => {
      const fakeB64 = Buffer.from('fake-image-data').toString('base64');
      mockImagesGenerate.mockResolvedValue({
        data: [{ b64_json: fakeB64 }],
      });

      const result = await handler.generate(createInput());

      expect(result.usage).toBeUndefined();
    });
  });

  // The SDK only routes requests to /deployments/{name}/… when the client is
  // constructed with `deployment`: for images.edit the body is multipart
  // FormData by the time AzureOpenAI.buildRequest looks for a model name, so
  // a deployment-less client sends edits to a URL Azure 404s on.
  describe('client construction', () => {
    const stubGenerate = () => {
      mockImagesGenerate.mockResolvedValue({
        data: [{ b64_json: Buffer.from('img').toString('base64') }],
      });
    };

    it('should construct the client with the model name as deployment', async () => {
      stubGenerate();

      await handler.generate(createInput());

      expect(mockAzureOpenAICtor).toHaveBeenCalledTimes(1);
      expect(mockAzureOpenAICtor).toHaveBeenCalledWith(
        expect.objectContaining({ deployment: 'gpt-image-1' }),
      );
    });

    it('should use the image API version instead of the shared Azure API version', async () => {
      configService.get.mockImplementation((key: string) =>
        key === 'models.azure.imageApiVersion'
          ? '2025-04-01-preview'
          : '2024-12-01-preview',
      );
      stubGenerate();

      await handler.generate(createInput());

      expect(mockAzureOpenAICtor).toHaveBeenCalledWith(
        expect.objectContaining({ apiVersion: '2025-04-01-preview' }),
      );
    });

    it('should construct the client with the deployment for reference-image edits', async () => {
      mockImagesEdit.mockResolvedValue({
        data: [{ b64_json: Buffer.from('img').toString('base64') }],
      });

      await handler.generate(
        createInput({
          referenceImages: [
            { data: Buffer.from('uploaded-scan'), contentType: 'image/png' },
          ],
        }),
      );

      expect(mockAzureOpenAICtor).toHaveBeenCalledTimes(1);
      expect(mockAzureOpenAICtor).toHaveBeenCalledWith(
        expect.objectContaining({ deployment: 'gpt-image-1' }),
      );
    });

    it('should reuse the cached client for the same model', async () => {
      stubGenerate();

      await handler.generate(createInput());
      await handler.generate(createInput());

      expect(mockAzureOpenAICtor).toHaveBeenCalledTimes(1);
    });

    it('should construct a separate client per model deployment', async () => {
      stubGenerate();
      const otherModel = new ImageGenerationModel({
        name: 'gpt-image-1-mini',
        provider: ModelProvider.AZURE,
        displayName: 'GPT Image 1 Mini',
        isArchived: false,
      });

      await handler.generate(createInput());
      await handler.generate(
        new ImageGenerationInput({ model: otherModel, prompt: 'a sunset' }),
      );

      expect(mockAzureOpenAICtor).toHaveBeenCalledTimes(2);
      expect(mockAzureOpenAICtor).toHaveBeenLastCalledWith(
        expect.objectContaining({ deployment: 'gpt-image-1-mini' }),
      );
    });
  });
});
