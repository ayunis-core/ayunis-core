import { Injectable, Logger } from '@nestjs/common';
import { SplitterHandler } from './ports/splitter.handler';
import { SplitterType } from '../domain/splitter-type.enum';
import {
  NoSplitterProviderAvailableError,
  SplitterProviderNotFoundError,
} from './splitter.errors';

@Injectable()
export class SplitterHandlerRegistry {
  private readonly logger = new Logger(SplitterHandlerRegistry.name);
  private readonly handlers = new Map<SplitterType, SplitterHandler>();

  registerHandler(type: SplitterType, handler: SplitterHandler): void {
    this.handlers.set(type, handler);
  }

  getHandler(type: SplitterType): SplitterHandler {
    this.logger.debug('getHandler', { type });
    const handler = this.handlers.get(type);

    if (!handler) {
      throw new SplitterProviderNotFoundError(type);
    }

    if (!handler.isAvailable()) {
      throw new NoSplitterProviderAvailableError(type);
    }

    return handler;
  }

  getAvailableTypes(): SplitterType[] {
    this.logger.debug('getAvailableTypes');
    return Array.from(this.handlers.entries())
      .filter(([, handler]) => handler.isAvailable())
      .map(([type]) => type);
  }
}
