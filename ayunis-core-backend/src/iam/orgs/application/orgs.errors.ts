import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';

/**
 * Error codes specific to the Orgs domain
 */
export enum OrgErrorCode {
  ORG_NOT_FOUND = 'ORG_NOT_FOUND',
  ORG_ALREADY_EXISTS = 'ORG_ALREADY_EXISTS',
  ORG_CREATION_FAILED = 'ORG_CREATION_FAILED',
  ORG_UPDATE_FAILED = 'ORG_UPDATE_FAILED',
  ORG_DELETION_FAILED = 'ORG_DELETION_FAILED',
  ORG_RETRIEVAL_FAILED = 'ORG_RETRIEVAL_FAILED',
  ORG_UNAUTHORIZED = 'ORG_UNAUTHORIZED',
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
      case 500:
        return new InternalServerErrorException({
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
      400,
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
