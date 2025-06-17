import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingsHandler } from './ports/embeddings.handler';
import { EmbeddingsProvider } from '../domain/embeddings-provider.enum';
import {
  NoEmbeddingsProviderAvailableError,
  EmbeddingsProviderNotFoundError,
} from './embeddings.errors';

@Injectable()
export class EmbeddingsProviderRegistry {
  private readonly logger = new Logger(EmbeddingsProviderRegistry.name);
  private readonly handlers = new Map<EmbeddingsProvider, EmbeddingsHandler>();

  registerHandler(
    provider: EmbeddingsProvider,
    handler: EmbeddingsHandler,
  ): void {
    this.logger.debug(
      `Registering embeddings handler for provider: ${provider}`,
    );
    this.handlers.set(provider, handler);
  }

  getHandler(provider: EmbeddingsProvider): EmbeddingsHandler {
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
    return Array.from(this.handlers.entries())
      .filter(([_, handler]) => handler.isAvailable())
      .map(([provider]) => provider);
  }
}
