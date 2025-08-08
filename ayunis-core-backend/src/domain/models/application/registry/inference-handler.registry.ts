import { Injectable, Logger } from '@nestjs/common';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { InferenceHandler } from '../ports/inference.handler';
import { ModelProviderNotSupportedError } from '../models.errors';

@Injectable()
export class InferenceHandlerRegistry {
  private readonly logger = new Logger(InferenceHandlerRegistry.name);
  private readonly handlers = new Map<ModelProvider, InferenceHandler>();

  constructor() {
    this.logger.log(InferenceHandlerRegistry.name);
    // prebuilt handlers are registered in models.module.ts
  }

  register(provider: ModelProvider, handler: InferenceHandler): void {
    this.handlers.set(provider, handler);
  }

  getHandler(provider: ModelProvider): InferenceHandler {
    this.logger.log('getHandler', provider);
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
