import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingsHandler } from './ports/embeddings.handler';
import { EmbeddingsProvider } from '../domain/embeddings-provider.enum';
import {
  NoEmbeddingsProviderAvailableError,
  EmbeddingsProviderNotFoundError,
} from './embeddings.errors';

@Injectable()
export class EmbeddingsHandlerRegistry {
  private readonly logger = new Logger(EmbeddingsHandlerRegistry.name);
  private readonly handlers = new Map<EmbeddingsProvider, EmbeddingsHandler>();

  registerHandler(
    provider: EmbeddingsProvider,
    handler: EmbeddingsHandler,
  ): void {
    this.handlers.set(provider, handler);
  }

  getHandler(provider: EmbeddingsProvider): EmbeddingsHandler {
    this.logger.debug('getHandler', { provider });
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
