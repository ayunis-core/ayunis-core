import { UUID } from 'crypto';
import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';

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
