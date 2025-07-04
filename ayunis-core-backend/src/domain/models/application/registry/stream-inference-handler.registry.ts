import { Injectable, Logger } from '@nestjs/common';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { StreamInferenceHandler } from '../ports/stream-inference.handler';
import { ModelProviderNotSupportedError } from '../models.errors';

@Injectable()
export class StreamInferenceHandlerRegistry {
  private readonly logger = new Logger(StreamInferenceHandlerRegistry.name);
  private readonly handlers = new Map<ModelProvider, StreamInferenceHandler>();

  constructor() {
    this.logger.log(StreamInferenceHandlerRegistry.name);
    // prebuilt handlers are registered in models.module.ts
  }

  register(provider: ModelProvider, handler: StreamInferenceHandler): void {
    this.logger.log('register', provider, handler);
    this.handlers.set(provider, handler);
  }

  getHandler(provider: ModelProvider): StreamInferenceHandler {
    this.logger.log('getHandler', provider);
    const handler = this.handlers.get(provider);
    if (!handler) {
      this.logger.error('Handler not found', { provider });
      throw new ModelProviderNotSupportedError(provider);
    }
    return handler;
  }
}
