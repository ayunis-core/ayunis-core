import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

export enum TeamErrorCode {
  TEAM_NOT_FOUND = 'TEAM_NOT_FOUND',
  TEAM_NAME_ALREADY_EXISTS = 'TEAM_NAME_ALREADY_EXISTS',
  TEAM_CREATION_FAILED = 'TEAM_CREATION_FAILED',
  TEAM_RETRIEVAL_FAILED = 'TEAM_RETRIEVAL_FAILED',
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

export class TeamCreationFailedError extends TeamError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, TeamErrorCode.TEAM_CREATION_FAILED, 400, metadata);
  }
}

export class TeamRetrievalFailedError extends TeamError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, TeamErrorCode.TEAM_RETRIEVAL_FAILED, 500, metadata);
  }
}
