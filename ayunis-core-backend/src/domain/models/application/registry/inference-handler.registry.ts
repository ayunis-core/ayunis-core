import { Injectable, Logger } from '@nestjs/common';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { InferenceHandler } from '../ports/inference.handler';
import { ModelProviderNotSupportedError } from '../models.errors';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InferenceHandlerRegistry {
  private readonly logger = new Logger(InferenceHandlerRegistry.name);
  private readonly handlers = new Map<ModelProvider, InferenceHandler>();
  private mockHandler: InferenceHandler;

  constructor(private readonly configService: ConfigService) {
    this.logger.log(InferenceHandlerRegistry.name);
    // prebuilt handlers are registered in models.module.ts
  }

  register(provider: ModelProvider, handler: InferenceHandler): void {
    this.handlers.set(provider, handler);
  }

  registerMockHandler(handler: InferenceHandler): void {
    this.mockHandler = handler;
  }

  getHandler(provider: ModelProvider): InferenceHandler {
    this.logger.log('getHandler', provider);
    const isTest = this.configService.get('NODE_ENV') === 'test';
    if (isTest) {
      return this.mockHandler;
    }
    const handler = this.handlers.get(provider);
    if (!handler) {
      this.logger.error('Handler not found', {
        provider,
      });
      throw new ModelProviderNotSupportedError(provider);
    }
    return handler;
  }
}
