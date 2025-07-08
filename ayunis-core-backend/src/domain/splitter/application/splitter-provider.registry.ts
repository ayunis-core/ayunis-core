import { Injectable, Logger } from '@nestjs/common';
import { SplitterHandler } from './ports/splitter.handler';
import { SplitterProvider } from '../domain/splitter-provider.enum';
import {
  NoSplitterProviderAvailableError,
  SplitterProviderNotFoundError,
} from './splitter.errors';

@Injectable()
export class SplitterProviderRegistry {
  private readonly logger = new Logger(SplitterProviderRegistry.name);
  private readonly handlers = new Map<SplitterProvider, SplitterHandler>();

  registerHandler(provider: SplitterProvider, handler: SplitterHandler): void {
    this.logger.debug(`Registering splitter handler for provider: ${provider}`);
    this.handlers.set(provider, handler);
  }

  getHandler(provider: SplitterProvider): SplitterHandler {
    const handler = this.handlers.get(provider);

    if (!handler) {
      throw new SplitterProviderNotFoundError(provider);
    }

    if (!handler.isAvailable()) {
      throw new NoSplitterProviderAvailableError(provider);
    }

    return handler;
  }

  getAvailableProviders(): SplitterProvider[] {
    return Array.from(this.handlers.entries())
      .filter(([, handler]) => handler.isAvailable())
      .map(([provider]) => provider);
  }
}
