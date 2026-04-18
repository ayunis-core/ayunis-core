import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APIError, AzureOpenAI } from 'openai';
import {
  ImageGenerationHandler,
  ImageGenerationInput,
  ImageGenerationResult,
} from '../../application/ports/image-generation.handler';
import { ImageGenerationFailedError } from '../../application/models.errors';
import type { ImageModel } from 'openai/resources/images';

const VALID_SIZES = ['1024x1024', '1024x1536', '1536x1024', 'auto'] as const;
type ImageSize = (typeof VALID_SIZES)[number];

const VALID_QUALITIES = ['low', 'medium', 'high', 'auto'] as const;
type ImageQuality = (typeof VALID_QUALITIES)[number];

function isValidSize(value: string): value is ImageSize {
  return (VALID_SIZES as readonly string[]).includes(value);
}

function isValidQuality(value: string): value is ImageQuality {
  return (VALID_QUALITIES as readonly string[]).includes(value);
}

@Injectable()
export class AzureImageGenerationHandler extends ImageGenerationHandler {
  private readonly logger = new Logger(AzureImageGenerationHandler.name);
  private client: AzureOpenAI | null = null;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  private getClient(): AzureOpenAI {
    this.client ??= new AzureOpenAI({
      apiKey: this.configService.get('models.azure.apiKey'),
      endpoint: this.configService.get('models.azure.endpoint'),
      apiVersion: this.configService.get('models.azure.apiVersion'),
    });
    return this.client;
  }

  private validateParams(input: ImageGenerationInput): {
    size: ImageSize;
    quality: ImageQuality;
  } {
    const size = input.size ?? '1024x1024';
    if (!isValidSize(size)) {
      throw new ImageGenerationFailedError(
        `Unsupported image size '${size}'. Supported sizes: ${VALID_SIZES.join(', ')}`,
      );
    }

    const quality = input.quality ?? 'auto';
    if (!isValidQuality(quality)) {
      throw new ImageGenerationFailedError(
        `Unsupported image quality '${quality}'. Supported qualities: ${VALID_QUALITIES.join(', ')}`,
      );
    }

    return { size, quality };
  }

  async generate(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    this.logger.log('Generating image', {
      model: input.model.name,
      size: input.size,
      quality: input.quality,
    });

    const { size, quality } = this.validateParams(input);
    const client = this.getClient();

    try {
      const response = await client.images.generate({
        model: input.model.name as ImageModel,
        prompt: input.prompt,
        size,
        quality,
        n: 1,
      });

      const imageData = response.data?.[0];
      if (!imageData?.b64_json) {
        throw new ImageGenerationFailedError(
          'No image data returned from Azure OpenAI',
        );
      }

      const imageBuffer = Buffer.from(imageData.b64_json, 'base64');

      const usage = response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined;

      this.logger.log('Image generated successfully', {
        model: input.model.name,
        sizeBytes: imageBuffer.length,
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
        totalTokens: usage?.totalTokens,
      });

      return new ImageGenerationResult(
        imageBuffer,
        'image/png',
        imageData.revised_prompt,
        usage,
      );
    } catch (error) {
      if (error instanceof ImageGenerationFailedError) {
        throw error;
      }

      if (error instanceof APIError) {
        const errorCode = String(error.code ?? '');
        this.logger.error('Azure OpenAI API error during image generation', {
          status: String(error.status ?? ''),
          code: errorCode,
          message: error.message,
          model: input.model.name,
        });

        if (errorCode === 'content_policy_violation') {
          throw new ImageGenerationFailedError(
            'The image could not be generated because the prompt was flagged by the content policy. Please revise your prompt and try again.',
          );
        }

        throw new ImageGenerationFailedError(
          'The image could not be generated due to a service error. Please try again later.',
        );
      }

      this.logger.error('Unexpected error during image generation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: input.model.name,
      });

      throw new ImageGenerationFailedError(
        'An unexpected error occurred while generating the image. Please try again later.',
      );
    }
  }
}
