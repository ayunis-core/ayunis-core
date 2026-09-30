import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingsHandler } from './ports/embeddings.handler';
import { EmbeddingsProvider } from 'src/domain/rag/embeddings/domain/embeddings-provider.enum';
import {
  NoEmbeddingsProviderAvailableError,
  EmbeddingsProviderNotFoundError,
} from './embeddings.errors';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingsHandlerRegistry {
  private readonly logger = new Logger(EmbeddingsHandlerRegistry.name);

  private readonly handlers = new Map<EmbeddingsProvider, EmbeddingsHandler>();
  private mockHandler: EmbeddingsHandler;

  constructor(private readonly configService: ConfigService) {}

  registerHandler(
    provider: EmbeddingsProvider,
    handler: EmbeddingsHandler,
  ): void {
    this.handlers.set(provider, handler);
  }

  registerMockHandler(handler: EmbeddingsHandler): void {
    this.mockHandler = handler;
  }

  getHandler(provider: EmbeddingsProvider): EmbeddingsHandler {
    this.logger.debug({ provider }, 'getHandler');
    if (this.configService.get<boolean>('app.mockInference')) {
      return this.mockHandler;
    }
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
