import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum NotificationErrorCode {
  NOTIFICATION_NOT_FOUND = 'NOTIFICATION_NOT_FOUND',
  NOTIFICATION_IMAGE_NOT_FOUND = 'NOTIFICATION_IMAGE_NOT_FOUND',
  NOTIFICATION_INVALID = 'NOTIFICATION_INVALID',
  NOTIFICATION_LIMIT_REACHED = 'NOTIFICATION_LIMIT_REACHED',
  UNEXPECTED_NOTIFICATION_ERROR = 'UNEXPECTED_NOTIFICATION_ERROR',
}

export abstract class NotificationError extends ApplicationError {
  constructor(
    message: string,
    code: NotificationErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

/** Also answers for another user's notification, so it cannot be probed. */
export class NotificationNotFoundError extends NotificationError {
  constructor(notificationId: string, metadata?: ErrorMetadata) {
    super(
      `Notification with ID '${notificationId}' not found`,
      NotificationErrorCode.NOTIFICATION_NOT_FOUND,
      404,
      { notificationId, ...metadata },
    );
  }
}

export class NotificationImageNotFoundError extends NotificationError {
  constructor(notificationId: string, metadata?: ErrorMetadata) {
    super(
      `Notification with ID '${notificationId}' has no image`,
      NotificationErrorCode.NOTIFICATION_IMAGE_NOT_FOUND,
      404,
      { notificationId, ...metadata },
    );
  }
}

export class NotificationInvalidError extends NotificationError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid notification: ${reason}`,
      NotificationErrorCode.NOTIFICATION_INVALID,
      400,
      metadata,
    );
  }
}

/** The routine thread already has as many notifications as it may send. */
export class NotificationLimitReachedError extends NotificationError {
  constructor(limit: number, metadata?: ErrorMetadata) {
    super(
      `At most ${limit} notifications can be sent from one routine run`,
      NotificationErrorCode.NOTIFICATION_LIMIT_REACHED,
      409,
      { limit, ...metadata },
    );
  }
}

export class UnexpectedNotificationError extends NotificationError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      'Unexpected notification error',
      NotificationErrorCode.UNEXPECTED_NOTIFICATION_ERROR,
      500,
      metadata,
    );
    this.cause = error;
  }
}
