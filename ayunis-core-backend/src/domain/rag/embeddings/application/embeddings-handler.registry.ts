import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EmbeddingsHandler } from './ports/embeddings.handler';
import { EmbeddingsProvider } from '../domain/embeddings-provider.enum';
import {
  NoEmbeddingsProviderAvailableError,
  EmbeddingsProviderNotFoundError,
} from './embeddings.errors';

@Injectable()
export class EmbeddingsHandlerRegistry {
  constructor(
    @InjectPinoLogger(EmbeddingsHandlerRegistry.name)
    private readonly logger: PinoLogger,
  ) {}

  private readonly handlers = new Map<EmbeddingsProvider, EmbeddingsHandler>();

  registerHandler(
    provider: EmbeddingsProvider,
    handler: EmbeddingsHandler,
  ): void {
    this.handlers.set(provider, handler);
  }

  getHandler(provider: EmbeddingsProvider): EmbeddingsHandler {
    this.logger.debug({ provider }, 'getHandler');
    const handler = this.handlers.get(provider);

    if (!handler) {
      throw new EmbeddingsProviderNotFoundError(provider);
    }

    if (!handler.isAvailable()) {
      throw new NoEmbeddingsProviderAvailableError(provider);
    }

    return handler;
  }

  getAvailableProviders(): EmbeddingsProvider[] {
    this.logger.debug('getAvailableProviders');
    return Array.from(this.handlers.entries())
      .filter(([, handler]) => handler.isAvailable())
      .map(([provider]) => provider);
  }
}
