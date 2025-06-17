import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

/**
 * Error codes specific to the Messages domain
 */
export enum MessageErrorCode {
  MESSAGE_CONTENT_INVALID = 'MESSAGE_CONTENT_INVALID',
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
}

/**
 * Base message error that all message-specific errors should extend
 */
export abstract class MessageError extends ApplicationError {
  constructor(
    message: string,
    code: MessageErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }

  /**
   * Convert to a NestJS HTTP exception
   */
  toHttpException() {
    switch (this.statusCode) {
      case 404:
        return new NotFoundException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
      case 409:
        return new ConflictException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
      default:
        return new BadRequestException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
    }
  }
}

/**
 * Error thrown when message content is invalid
 */
export class MessageContentInvalidError extends MessageError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Message content is invalid: ${reason}`,
      MessageErrorCode.MESSAGE_CONTENT_INVALID,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when message is too long
 */
export class MessageTooLongError extends MessageError {
  constructor(length: number, maxLength: number, metadata?: ErrorMetadata) {
    super(
      `Message exceeds maximum length: ${length} > ${maxLength}`,
      MessageErrorCode.MESSAGE_TOO_LONG,
      400,
      metadata,
    );
  }
}

export class MessageCreationError extends ApplicationError {
  constructor(messageType: string, error: Error, metadata?: ErrorMetadata) {
    super(
      `Failed to create ${messageType} message: ${error.message}`,
      'MESSAGE_CREATION_FAILED',
      500,
      {
        messageType,
        originalError: error.message,
        ...metadata,
      },
    );
  }
}

export class MessageNotFoundError extends ApplicationError {
  constructor(messageId: string, metadata?: ErrorMetadata) {
    super(
      `Message with ID '${messageId}' not found`,
      'MESSAGE_NOT_FOUND',
      404,
      {
        messageId,
        ...metadata,
      },
    );
  }
}

export class ThreadMessagesError extends ApplicationError {
  constructor(threadId: string, error: Error, metadata?: ErrorMetadata) {
    super(
      `Failed to process messages for thread '${threadId}': ${error.message}`,
      'THREAD_MESSAGES_ERROR',
      500,
      {
        threadId,
        originalError: error.message,
        ...metadata,
      },
    );
  }
}
