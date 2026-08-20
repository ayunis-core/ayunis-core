import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum WorkspaceErrorCode {
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  WORKSPACE_INVALID_NAME = 'WORKSPACE_INVALID_NAME',
  WORKSPACE_INVALID_DESCRIPTION = 'WORKSPACE_INVALID_DESCRIPTION',
  WORKSPACE_INVALID_APPEARANCE = 'WORKSPACE_INVALID_APPEARANCE',
  MISSING_FILE = 'MISSING_FILE',
  WORKSPACE_SOURCE_LIMIT_EXCEEDED = 'WORKSPACE_SOURCE_LIMIT_EXCEEDED',
  WORKSPACE_INSUFFICIENT_ROLE = 'WORKSPACE_INSUFFICIENT_ROLE',
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

export class InvalidWorkspaceNameError extends WorkspaceError {
  constructor(name: string, metadata?: ErrorMetadata) {
    super(
      `Invalid workspace name "${name}". Names must not be empty, must not ` +
        `exceed the maximum length, must not start or end with whitespace, ` +
        `and must not contain control characters.`,
      WorkspaceErrorCode.WORKSPACE_INVALID_NAME,
      400,
      metadata,
    );
  }
}

export class InvalidWorkspaceDescriptionError extends WorkspaceError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Invalid workspace description: exceeds the maximum length.',
      WorkspaceErrorCode.WORKSPACE_INVALID_DESCRIPTION,
      400,
      metadata,
    );
  }
}

export class InvalidWorkspaceAppearanceError extends WorkspaceError {
  constructor(field: 'icon' | 'color', metadata?: ErrorMetadata) {
    super(
      `Invalid workspace ${field}: not a valid catalogue key` +
        (field === 'color' ? ' or #rrggbb value.' : '.'),
      WorkspaceErrorCode.WORKSPACE_INVALID_APPEARANCE,
      400,
      { field, ...metadata },
    );
  }
}

export class MissingWorkspaceDocumentFileError extends WorkspaceError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'No file was provided in the request',
      WorkspaceErrorCode.MISSING_FILE,
      400,
      metadata,
    );
  }
}

export class WorkspaceSourceLimitExceededError extends WorkspaceError {
  constructor(maxSources: number, metadata?: ErrorMetadata) {
    super(
      `Workspace cannot have more than ${maxSources} sources`,
      WorkspaceErrorCode.WORKSPACE_SOURCE_LIMIT_EXCEEDED,
      400,
      { maxSources, ...metadata },
    );
  }
}

export class WorkspaceInsufficientRoleError extends WorkspaceError {
  constructor(
    workspaceId: string,
    requiredRole: string,
    actualRole: string,
    metadata?: ErrorMetadata,
  ) {
    super(
      `Workspace role '${requiredRole}' is required`,
      WorkspaceErrorCode.WORKSPACE_INSUFFICIENT_ROLE,
      403,
      { workspaceId, requiredRole, actualRole, ...metadata },
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
