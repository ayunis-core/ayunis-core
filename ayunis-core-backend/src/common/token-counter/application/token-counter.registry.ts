import { Injectable, Logger } from '@nestjs/common';
import {
  TokenCounterHandler,
  TokenCounterType,
} from './ports/token-counter.handler.port';
import {
  TokenCounterHandlerNotFoundError,
  TokenCounterHandlerNotAvailableError,
} from './token-counter.errors';

@Injectable()
export class TokenCounterRegistry {
  private readonly logger = new Logger(TokenCounterRegistry.name);
  private readonly handlers = new Map<TokenCounterType, TokenCounterHandler>();

  registerHandler(handler: TokenCounterHandler): void {
    this.handlers.set(handler.type, handler);
  }

  getHandler(type: TokenCounterType): TokenCounterHandler {
    this.logger.debug('getHandler', { type });
    const handler = this.handlers.get(type);

    if (!handler) {
      throw new TokenCounterHandlerNotFoundError(type);
    }

    if (!handler.isAvailable()) {
      throw new TokenCounterHandlerNotAvailableError(type);
    }

    return handler;
  }

  getDefaultHandler(): TokenCounterHandler {
    this.logger.debug('getDefaultHandler');

    // Prefer tiktoken if available
    const tiktokenHandler = this.handlers.get(TokenCounterType.TIKTOKEN);
    if (tiktokenHandler?.isAvailable()) {
      return tiktokenHandler;
    }

    // Fallback to simple handler
    const simpleHandler = this.handlers.get(TokenCounterType.SIMPLE);
    if (simpleHandler?.isAvailable()) {
      return simpleHandler;
    }

    throw new TokenCounterHandlerNotFoundError(TokenCounterType.TIKTOKEN);
  }

  getAvailableTypes(): TokenCounterType[] {
    this.logger.debug('getAvailableTypes');
    return Array.from(this.handlers.entries())
      .filter(([, handler]) => handler.isAvailable())
      .map(([type]) => type);
  }
}
