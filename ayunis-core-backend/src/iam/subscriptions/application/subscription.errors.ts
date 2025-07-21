import { UUID } from 'crypto';
import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

export enum SubscriptionErrorCode {
  SUBSCRIPTION_NOT_FOUND = 'SUBSCRIPTION_NOT_FOUND',
  MULTIPLE_ACTIVE_SUBSCRIPTIONS = 'MULTIPLE_ACTIVE_SUBSCRIPTIONS',
  SUBSCRIPTION_ALREADY_EXISTS = 'SUBSCRIPTION_ALREADY_EXISTS',
  SUBSCRIPTION_ALREADY_CANCELLED = 'SUBSCRIPTION_ALREADY_CANCELLED',
  SUBSCRIPTION_NOT_CANCELLED = 'SUBSCRIPTION_NOT_CANCELLED',
  INSUFFICIENT_SEATS = 'INSUFFICIENT_SEATS',
  TOO_MANY_USED_SEATS = 'TOO_MANY_USED_SEATS',
  INVALID_RENEWAL_CYCLE = 'INVALID_RENEWAL_CYCLE',
  UNAUTHORIZED_SUBSCRIPTION_ACCESS = 'UNAUTHORIZED_SUBSCRIPTION_ACCESS',
  INVALID_SUBSCRIPTION_DATA = 'INVALID_SUBSCRIPTION_DATA',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  PRICE_NOT_FOUND = 'PRICE_NOT_FOUND',

  // Trial-related errors
  TRIAL_NOT_FOUND = 'TRIAL_NOT_FOUND',
  TRIAL_ALREADY_EXISTS = 'TRIAL_ALREADY_EXISTS',
  TRIAL_CAPACITY_EXCEEDED = 'TRIAL_CAPACITY_EXCEEDED',
  TRIAL_CREATION_FAILED = 'TRIAL_CREATION_FAILED',
  TRIAL_UPDATE_FAILED = 'TRIAL_UPDATE_FAILED',
}

/**
 * Base subscription error that all subscription-specific errors should extend
 */
export abstract class SubscriptionError extends ApplicationError {
  constructor(
    message: string,
    code: SubscriptionErrorCode,
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
      case 403:
        return new ForbiddenException({
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
 * Error thrown when a subscription is not found
 */
export class SubscriptionNotFoundError extends SubscriptionError {
  constructor(orgId: UUID, metadata?: ErrorMetadata) {
    super(
      `Subscription for organization '${orgId}' not found`,
      SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
      404,
      {
        orgId,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when there are multiple active subscriptions for an organization
/**
 * Error thrown when there are multiple active subscriptions for an organization
 */
export class MultipleActiveSubscriptionsError extends SubscriptionError {
  constructor(orgId: UUID, metadata?: ErrorMetadata) {
    super(
      `Multiple active subscriptions for organization '${orgId}'`,
      SubscriptionErrorCode.MULTIPLE_ACTIVE_SUBSCRIPTIONS,
      400,
      {
        orgId,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when a subscription already exists for an organization
 */
export class SubscriptionAlreadyExistsError extends SubscriptionError {
  constructor(orgId: UUID, metadata?: ErrorMetadata) {
    super(
      `Subscription for organization '${orgId}' already exists`,
      SubscriptionErrorCode.SUBSCRIPTION_ALREADY_EXISTS,
      409,
      {
        orgId,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when trying to cancel an already cancelled subscription
 */
export class SubscriptionAlreadyCancelledError extends SubscriptionError {
  constructor(orgId: UUID, metadata?: ErrorMetadata) {
    super(
      `Subscription for organization '${orgId}' is already cancelled`,
      SubscriptionErrorCode.SUBSCRIPTION_ALREADY_CANCELLED,
      400,
      {
        orgId,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when trying to uncancel a subscription that is not cancelled
 */
export class SubscriptionNotCancelledError extends SubscriptionError {
  constructor(orgId: UUID, metadata?: ErrorMetadata) {
    super(
      `Subscription for organization '${orgId}' is not cancelled`,
      SubscriptionErrorCode.SUBSCRIPTION_NOT_CANCELLED,
      400,
      {
        orgId,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when there are insufficient seats for an operation
 */
export class InsufficientSeatsError extends SubscriptionError {
  constructor(
    requiredSeats: number,
    availableSeats: number,
    metadata?: ErrorMetadata,
  ) {
    super(
      `Insufficient seats: required ${requiredSeats}, available ${availableSeats}`,
      SubscriptionErrorCode.INSUFFICIENT_SEATS,
      400,
      {
        requiredSeats,
        availableSeats,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when there are too many used seats
/**
 * Error thrown when there are too many used seats
 */
export class TooManyUsedSeatsError extends SubscriptionError {
  constructor(metadata?: ErrorMetadata) {
    super(
      `Too many used seats`,
      SubscriptionErrorCode.TOO_MANY_USED_SEATS,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when an invalid renewal cycle is provided
 */
export class InvalidRenewalCycleError extends SubscriptionError {
  constructor(cycle: string, metadata?: ErrorMetadata) {
    super(
      `Invalid renewal cycle: ${cycle}`,
      SubscriptionErrorCode.INVALID_RENEWAL_CYCLE,
      400,
      {
        cycle,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when user tries to access a subscription they're not authorized for
 */
export class UnauthorizedSubscriptionAccessError extends SubscriptionError {
  constructor(userId: UUID, orgId: UUID, metadata?: ErrorMetadata) {
    super(
      `User '${userId}' is not authorized to access subscription for organization '${orgId}'`,
      SubscriptionErrorCode.UNAUTHORIZED_SUBSCRIPTION_ACCESS,
      403,
      {
        userId,
        orgId,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when subscription data is invalid
 */
export class InvalidSubscriptionDataError extends SubscriptionError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid subscription data: ${reason}`,
      SubscriptionErrorCode.INVALID_SUBSCRIPTION_DATA,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when an unexpected error occurs
 */
export class UnexpectedSubscriptionError extends SubscriptionError {
  constructor(reason?: string, metadata?: ErrorMetadata) {
    super(
      `Unexpected error: ${reason ? `: ${reason}` : ''}`,
      SubscriptionErrorCode.UNEXPECTED_ERROR,
      500,
      metadata,
    );
  }
}

/**
 * Error thrown when the price is not found
 */
export class PriceNotFoundError extends SubscriptionError {
  constructor(metadata?: ErrorMetadata) {
    super(
      `Price not found`,
      SubscriptionErrorCode.PRICE_NOT_FOUND,
      500,
      metadata,
    );
  }
}

// Trial-related errors

/**
 * Error thrown when a trial is not found
 */
export class TrialNotFoundError extends SubscriptionError {
  constructor(orgId: UUID, metadata?: ErrorMetadata) {
    super(
      `Trial for organization '${orgId}' not found`,
      SubscriptionErrorCode.TRIAL_NOT_FOUND,
      404,
      {
        orgId,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when a trial already exists for an organization
 */
export class TrialAlreadyExistsError extends SubscriptionError {
  constructor(orgId: UUID, metadata?: ErrorMetadata) {
    super(
      `Trial for organization '${orgId}' already exists`,
      SubscriptionErrorCode.TRIAL_ALREADY_EXISTS,
      409,
      {
        orgId,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when trial capacity is exceeded
 */
export class TrialCapacityExceededError extends SubscriptionError {
  constructor(
    orgId: UUID,
    messagesSent: number,
    maxMessages: number,
    metadata?: ErrorMetadata,
  ) {
    super(
      `Trial capacity exceeded for organization '${orgId}': ${messagesSent}/${maxMessages} messages used`,
      SubscriptionErrorCode.TRIAL_CAPACITY_EXCEEDED,
      403,
      {
        orgId,
        messagesSent,
        maxMessages,
        remainingMessages: maxMessages - messagesSent,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when trial creation fails
 */
export class TrialCreationFailedError extends SubscriptionError {
  constructor(orgId: UUID, reason?: string, metadata?: ErrorMetadata) {
    super(
      `Trial creation failed for organization '${orgId}'${reason ? `: ${reason}` : ''}`,
      SubscriptionErrorCode.TRIAL_CREATION_FAILED,
      500,
      {
        orgId,
        reason,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when trial update fails
 */
export class TrialUpdateFailedError extends SubscriptionError {
  constructor(orgId: UUID, reason?: string, metadata?: ErrorMetadata) {
    super(
      `Trial update failed for organization '${orgId}'${reason ? `: ${reason}` : ''}`,
      SubscriptionErrorCode.TRIAL_UPDATE_FAILED,
      500,
      {
        orgId,
        reason,
        ...metadata,
      },
    );
  }
}

/**
 * Error thrown when an unexpected error occurs during trial operations
 */
export class UnexpectedTrialError extends SubscriptionError {
  constructor(orgId: UUID, reason?: string, metadata?: ErrorMetadata) {
    super(
      `Unexpected trial error for organization '${orgId}'${reason ? `: ${reason}` : ''}`,
      SubscriptionErrorCode.UNEXPECTED_ERROR,
      500,
      {
        orgId,
        reason,
        ...metadata,
      },
    );
  }
}
