import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

export enum TeamErrorCode {
  TEAM_NOT_FOUND = 'TEAM_NOT_FOUND',
  TEAM_NAME_ALREADY_EXISTS = 'TEAM_NAME_ALREADY_EXISTS',
  TEAM_INVALID_INPUT = 'TEAM_INVALID_INPUT',
  UNEXPECTED_TEAM_ERROR = 'UNEXPECTED_TEAM_ERROR',
}

export abstract class TeamError extends ApplicationError {
  constructor(
    message: string,
    code: TeamErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }

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

export class TeamNotFoundError extends TeamError {
  constructor(teamId: string, metadata?: ErrorMetadata) {
    super(
      `Team with ID '${teamId}' not found`,
      TeamErrorCode.TEAM_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class TeamNameAlreadyExistsError extends TeamError {
  constructor(name: string, metadata?: ErrorMetadata) {
    super(
      `Team with name '${name}' already exists in this organization`,
      TeamErrorCode.TEAM_NAME_ALREADY_EXISTS,
      409,
      metadata,
    );
  }
}

/**
 * Error thrown when team input is invalid
 */
export class TeamInvalidInputError extends TeamError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid team input: ${reason}`,
      TeamErrorCode.TEAM_INVALID_INPUT,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when an unexpected error occurs
 */
export class UnexpectedTeamError extends TeamError {
  constructor(error: unknown) {
    super(
      'Unexpected error occurred',
      TeamErrorCode.UNEXPECTED_TEAM_ERROR,
      500,
      { error },
    );
  }
}
