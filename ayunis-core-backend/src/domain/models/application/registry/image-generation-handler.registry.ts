import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { ImageGenerationHandler } from '../ports/image-generation.handler';
import { ModelProviderNotSupportedError } from '../models.errors';

@Injectable()
export class ImageGenerationHandlerRegistry {
  private readonly handlers = new Map<ModelProvider, ImageGenerationHandler>();
  private mockHandler?: ImageGenerationHandler;

  constructor(
    @InjectPinoLogger(ImageGenerationHandlerRegistry.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {}

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
      this.logger.info('Using mock handler for image generation');
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
