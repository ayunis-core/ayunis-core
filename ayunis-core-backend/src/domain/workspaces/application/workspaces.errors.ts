import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum WorkspaceErrorCode {
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  WORKSPACE_INVALID_NAME = 'WORKSPACE_INVALID_NAME',
  WORKSPACE_INVALID_DESCRIPTION = 'WORKSPACE_INVALID_DESCRIPTION',
  WORKSPACE_INVALID_APPEARANCE = 'WORKSPACE_INVALID_APPEARANCE',
  WORKSPACE_MEMBER_NOT_FOUND = 'WORKSPACE_MEMBER_NOT_FOUND',
  WORKSPACE_MEMBER_NOT_IN_ORG = 'WORKSPACE_MEMBER_NOT_IN_ORG',
  WORKSPACE_LAST_ADMIN = 'WORKSPACE_LAST_ADMIN',
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

export class WorkspaceMemberNotFoundError extends WorkspaceError {
  constructor(workspaceId: string, userId: string, metadata?: ErrorMetadata) {
    super(
      `User '${userId}' is not a member of workspace '${workspaceId}'`,
      WorkspaceErrorCode.WORKSPACE_MEMBER_NOT_FOUND,
      404,
      { workspaceId, userId, ...metadata },
    );
  }
}

/** Unknown users and users of another organization are indistinguishable. */
export class WorkspaceMemberNotInOrgError extends WorkspaceError {
  constructor(userIds: string[], metadata?: ErrorMetadata) {
    super(
      'Only users of the same organization can be added to a workspace',
      WorkspaceErrorCode.WORKSPACE_MEMBER_NOT_IN_ORG,
      400,
      { userIds, ...metadata },
    );
  }
}

export class WorkspaceLastAdminError extends WorkspaceError {
  constructor(workspaceId: string, metadata?: ErrorMetadata) {
    super(
      `Workspace '${workspaceId}' must keep at least one admin`,
      WorkspaceErrorCode.WORKSPACE_LAST_ADMIN,
      409,
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
