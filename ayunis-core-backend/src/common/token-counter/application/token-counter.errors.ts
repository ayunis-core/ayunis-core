import { ApplicationError, ErrorMetadata } from '../../errors/base.error';
import { TokenCounterType } from './ports/token-counter.handler.port';

export enum TokenCounterErrorCode {
  HANDLER_NOT_FOUND = 'TOKEN_COUNTER_HANDLER_NOT_FOUND',
  HANDLER_NOT_AVAILABLE = 'TOKEN_COUNTER_HANDLER_NOT_AVAILABLE',
  COUNTING_FAILED = 'TOKEN_COUNTING_FAILED',
}

export class TokenCounterError extends ApplicationError {
  constructor(
    message: string,
    code: TokenCounterErrorCode,
    status: number,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, status, metadata);
    this.name = 'TokenCounterError';
  }
}

export class TokenCounterHandlerNotFoundError extends TokenCounterError {
  constructor(type: TokenCounterType, metadata?: ErrorMetadata) {
    super(
      `Token counter handler not found: ${type}`,
      TokenCounterErrorCode.HANDLER_NOT_FOUND,
      404,
      { type, ...metadata },
    );
    this.name = 'TokenCounterHandlerNotFoundError';
  }
}

export class TokenCounterHandlerNotAvailableError extends TokenCounterError {
  constructor(type: TokenCounterType, metadata?: ErrorMetadata) {
    super(
      `Token counter handler is not available: ${type}`,
      TokenCounterErrorCode.HANDLER_NOT_AVAILABLE,
      503,
      { type, ...metadata },
    );
    this.name = 'TokenCounterHandlerNotAvailableError';
  }
}

export class TokenCountingFailedError extends TokenCounterError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, TokenCounterErrorCode.COUNTING_FAILED, 500, metadata);
    this.name = 'TokenCountingFailedError';
  }
}
