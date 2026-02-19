import type { ErrorMetadata } from '../../../errors/base.error';
import { ApplicationError } from '../../../errors/base.error';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { WebhookEventType } from '../../domain/value-objects/webhook-event-type.enum';

export enum WebhookErrorCode {
  WEBHOOK_DELIVERY_FAILED = 'WEBHOOK_DELIVERY_FAILED',
  WEBHOOK_INVALID_URL = 'WEBHOOK_INVALID_URL',
  WEBHOOK_TIMEOUT = 'WEBHOOK_TIMEOUT',
}

/**
 * Base webhook error that all webhook-specific errors should extend
 */
export abstract class WebhookError extends ApplicationError {
  constructor(
    message: string,
    code: WebhookErrorCode,
    statusCode: number = 500,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }

  /**
   * Convert to a NestJS HTTP exception
   */
  toHttpException() {
    switch (this.statusCode) {
      case 400:
        return new BadRequestException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
      default:
        return new InternalServerErrorException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
    }
  }
}

/**
 * Error thrown when webhook delivery fails
 */
export class WebhookDeliveryFailedError extends WebhookError {
  constructor(
    eventType: WebhookEventType,
    reason: string,
    metadata?: ErrorMetadata,
  ) {
    super(
      `Failed to deliver webhook for event '${eventType}': ${reason}`,
      WebhookErrorCode.WEBHOOK_DELIVERY_FAILED,
      500,
      { eventType, reason, ...metadata },
    );
  }
}

/**
 * Error thrown when webhook URL is invalid
 */
export class WebhookInvalidUrlError extends WebhookError {
  constructor(url: string, metadata?: ErrorMetadata) {
    super(
      `Invalid webhook URL: ${url}`,
      WebhookErrorCode.WEBHOOK_INVALID_URL,
      400,
      { url, ...metadata },
    );
  }
}

/**
 * Error thrown when webhook request times out
 */
export class WebhookTimeoutError extends WebhookError {
  constructor(
    eventType: WebhookEventType,
    timeoutMs: number,
    metadata?: ErrorMetadata,
  ) {
    super(
      `Webhook delivery timed out after ${timeoutMs}ms for event '${eventType}'`,
      WebhookErrorCode.WEBHOOK_TIMEOUT,
      500,
      { eventType, timeoutMs, ...metadata },
    );
  }
}
