import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { ImageGenerationHandler } from '../ports/image-generation.handler';
import { ModelProviderNotSupportedError } from '../models.errors';

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
    const isTest = this.configService.get<boolean>('app.isTest');
    if (isTest) {
      if (!this.mockHandler) {
        throw new Error(
          'Mock image generation handler not registered. Call registerMockHandler() before using getHandler() in test environment.',
        );
      }
      this.logger.log('Using mock handler for image generation');
      return this.mockHandler;
    }
    const handler = this.handlers.get(provider);
    if (!handler) {
      this.logger.error('Image generation handler not found', { provider });
      throw new ModelProviderNotSupportedError(provider);
    }
    return handler;
  }
}
