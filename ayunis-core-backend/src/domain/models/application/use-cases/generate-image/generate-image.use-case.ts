import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ImageGenerationHandlerRegistry } from '../../registry/image-generation-handler.registry';
import {
  ImageGenerationInput,
  ImageGenerationResult,
} from '../../ports/image-generation.handler';
import { ImageGenerationFailedError } from '../../models.errors';
import { GenerateImageCommand } from './generate-image.command';

@Injectable()
export class GenerateImageUseCase {
  private readonly logger = new Logger(GenerateImageUseCase.name);

  constructor(
    private readonly imageGenerationHandlerRegistry: ImageGenerationHandlerRegistry,
  ) {}

  async execute(command: GenerateImageCommand): Promise<ImageGenerationResult> {
    this.logger.log('execute', {
      model: command.model.name,
      provider: command.model.provider,
    });

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
        }),
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Image generation failed', {
        model: command.model.name,
        provider: command.model.provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new ImageGenerationFailedError(
        'An unexpected error occurred during image generation',
      );
    }
  }
}
