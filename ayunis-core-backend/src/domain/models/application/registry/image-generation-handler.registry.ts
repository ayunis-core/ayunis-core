import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ImageGenerationHandler } from 'src/domain/models/application/ports/image-generation.handler';
import { ModelProviderNotSupportedError } from 'src/domain/models/application/models.errors';

@Injectable()
export class ImageGenerationHandlerRegistry {
  private readonly logger = new Logger(ImageGenerationHandlerRegistry.name);

  private readonly handlers = new Map<ModelProvider, ImageGenerationHandler>();
  private mockHandler?: ImageGenerationHandler;

  constructor(private readonly configService: ConfigService) {}

  register(provider: ModelProvider, handler: ImageGenerationHandler): void {
    this.handlers.set(provider, handler);
  }

  registerMockHandler(handler: ImageGenerationHandler): void {
    this.mockHandler = handler;
  }

  getHandler(provider: ModelProvider): ImageGenerationHandler {
    const mockInference = this.configService.get<boolean>('app.mockInference');
    if (mockInference) {
      if (!this.mockHandler) {
        throw new Error(
          'Mock image generation handler not registered. Call registerMockHandler() before using getHandler() when mock inference is enabled.',
        );
      }
      this.logger.log('Using mock handler for image generation');
      return this.mockHandler;
    }
    const handler = this.handlers.get(provider);
    if (!handler) {
      this.logger.error({ provider }, 'Image generation handler not found');
      throw new ModelProviderNotSupportedError(provider);
    }
    return handler;
  }
}
