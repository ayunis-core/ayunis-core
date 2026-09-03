import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import { ImageGenerationHandlerRegistry } from 'src/domain/models/application/registry/image-generation-handler.registry';
import {
  ImageGenerationInput,
  ImageGenerationResult,
} from 'src/domain/models/application/ports/image-generation.handler';
import { ImageGenerationFailedError } from 'src/domain/models/application/models.errors';
import { GenerateImageCommand } from './generate-image.command';

@Injectable()
export class GenerateImageUseCase {
  private readonly logger = new Logger(GenerateImageUseCase.name);

  constructor(
    private readonly imageGenerationHandlerRegistry: ImageGenerationHandlerRegistry,
  ) {}

  async execute(command: GenerateImageCommand): Promise<ImageGenerationResult> {
    this.logger.log(
      {
        model: command.model.name,
        provider: command.model.provider,
      },
      'execute',
    );

    try {
      const handler = this.imageGenerationHandlerRegistry.getHandler(
        command.model.provider,
      );

      return await handler.generate(
        new ImageGenerationInput({
          model: command.model,
          prompt: command.prompt,
          size: command.size,
          quality: command.quality,
          referenceImages: command.referenceImages,
        }),
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          model: command.model.name,
          provider: command.model.provider,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Image generation failed',
      );
      const providerError = wrapProviderFailure(error, {
        provider: command.model.provider,
        modelId: command.model.name,
      });
      if (providerError) {
        throw providerError;
      }
      throw new ImageGenerationFailedError(
        'An unexpected error occurred during image generation',
      );
    }
  }
}
