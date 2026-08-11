import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum WorkspaceErrorCode {
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  UNEXPECTED_WORKSPACE_ERROR = 'UNEXPECTED_WORKSPACE_ERROR',
}

export abstract class WorkspaceError extends ApplicationError {
  constructor(
    message: string,
    code: WorkspaceErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class WorkspaceNotFoundError extends WorkspaceError {
  constructor(workspaceId: string, metadata?: ErrorMetadata) {
    super(
      `Workspace with ID '${workspaceId}' not found`,
      WorkspaceErrorCode.WORKSPACE_NOT_FOUND,
      404,
      { workspaceId, ...metadata },
    );
  }
}

export class UnexpectedWorkspaceError extends WorkspaceError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      'Unexpected workspace error',
      WorkspaceErrorCode.UNEXPECTED_WORKSPACE_ERROR,
      500,
      metadata,
    );
    this.cause = error;
  }
}
