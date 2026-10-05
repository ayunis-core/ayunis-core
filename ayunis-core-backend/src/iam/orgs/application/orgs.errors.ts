import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

/**
 * Error codes specific to the Orgs domain
 */
export enum OrgErrorCode {
  ORG_PROCESSING_ACTIVE = 'ORG_PROCESSING_ACTIVE',
  ORG_DELETE_CONFIRMATION_MISMATCH = 'ORG_DELETE_CONFIRMATION_MISMATCH',
  ORG_NOT_ACTIVE = 'ORG_NOT_ACTIVE',
  ORG_SESSION_EXPIRED = 'ORG_SESSION_EXPIRED',
  ORG_NOT_FOUND = 'ORG_NOT_FOUND',
  ORG_ALREADY_EXISTS = 'ORG_ALREADY_EXISTS',
  ORG_CREATION_FAILED = 'ORG_CREATION_FAILED',
  ORG_UPDATE_FAILED = 'ORG_UPDATE_FAILED',
  ORG_DELETION_FAILED = 'ORG_DELETION_FAILED',
  ORG_RETRIEVAL_FAILED = 'ORG_RETRIEVAL_FAILED',
  ORG_UNAUTHORIZED = 'ORG_UNAUTHORIZED',
  ORG_UNEXPECTED_ERROR = 'ORG_UNEXPECTED_ERROR',
}

/**
 * Base org error that all org-specific errors should extend
 */
export abstract class OrgError extends ApplicationError {
  constructor(
    message: string,
    code: OrgErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

/**
 * Error thrown when an org is not found
 */
export class OrgNotFoundError extends OrgError {
  constructor(orgId: string, metadata?: ErrorMetadata) {
    super(
      `Organization with ID '${orgId}' not found`,
      OrgErrorCode.ORG_NOT_FOUND,
      404,
      metadata,
    );
  }
}

/**
 * Error thrown when an org already exists
 */
export class OrgAlreadyExistsError extends OrgError {
  constructor(name: string, metadata?: ErrorMetadata) {
    super(
      `Organization with name '${name}' already exists`,
      OrgErrorCode.ORG_ALREADY_EXISTS,
      409,
      metadata,
    );
  }
}

/**
 * Error thrown when org creation fails
 */
export class OrgCreationFailedError extends OrgError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Failed to create organization: ${reason}`,
      OrgErrorCode.ORG_CREATION_FAILED,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when org update fails
 */
export class OrgUpdateFailedError extends OrgError {
  constructor(orgId: string, reason: string, metadata?: ErrorMetadata) {
    super(
      `Failed to update organization with ID '${orgId}': ${reason}`,
      OrgErrorCode.ORG_UPDATE_FAILED,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when org deletion fails
 */
export class OrgDeletionFailedError extends OrgError {
  constructor(orgId: string, reason: string, metadata?: ErrorMetadata) {
    super(
      `Failed to delete organization with ID '${orgId}': ${reason}`,
      OrgErrorCode.ORG_DELETION_FAILED,
      500,
      metadata,
    );
  }
}

/**
 * Error thrown when retrieving organizations fails
 */
export class OrgRetrievalFailedError extends OrgError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Failed to retrieve organizations: ${reason}`,
      OrgErrorCode.ORG_RETRIEVAL_FAILED,
      500,
      metadata,
    );
  }
}

/**
 * Error thrown when an unauthorized org action is attempted
 */
export class OrgUnauthorizedError extends OrgError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Unauthorized: ${reason}`,
      OrgErrorCode.ORG_UNAUTHORIZED,
      403,
      metadata,
    );
  }
}

export class UnexpectedOrgError extends OrgError {
  constructor(error: Error) {
    super('Unexpected org error', OrgErrorCode.ORG_UNEXPECTED_ERROR, 500, {
      error,
    });
  }
}

export class OrgProcessingActiveError extends OrgError {
  constructor() {
    super(
      'Document processing is still running; retry deletion after it finishes',
      OrgErrorCode.ORG_PROCESSING_ACTIVE,
      409,
    );
  }
}

export class OrgAccessError extends OrgError {
  constructor(sessionExpired = false) {
    super(
      sessionExpired
        ? 'Organisation session has expired'
        : 'Organisation is not active',
      sessionExpired
        ? OrgErrorCode.ORG_SESSION_EXPIRED
        : OrgErrorCode.ORG_NOT_ACTIVE,
      401,
    );
  }
}

export class OrgDeleteConfirmationError extends OrgError {
  constructor() {
    super(
      'Organisation name does not match',
      OrgErrorCode.ORG_DELETE_CONFIRMATION_MISMATCH,
      400,
    );
  }
}
