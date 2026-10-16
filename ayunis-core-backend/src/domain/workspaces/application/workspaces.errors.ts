import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum WorkspaceErrorCode {
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  WORKSPACE_INVALID_NAME = 'WORKSPACE_INVALID_NAME',
  WORKSPACE_INVALID_DESCRIPTION = 'WORKSPACE_INVALID_DESCRIPTION',
  WORKSPACE_INVALID_APPEARANCE = 'WORKSPACE_INVALID_APPEARANCE',
  WORKSPACE_INSUFFICIENT_ACCESS = 'WORKSPACE_INSUFFICIENT_ACCESS',
  WORKSPACE_MEMBER_NOT_FOUND = 'WORKSPACE_MEMBER_NOT_FOUND',
  WORKSPACE_INVALID_SHARE_TARGET = 'WORKSPACE_INVALID_SHARE_TARGET',
  WORKSPACE_TEAM_NOT_SHARED = 'WORKSPACE_TEAM_NOT_SHARED',
  WORKSPACE_OWNER_ONLY = 'WORKSPACE_OWNER_ONLY',
  WORKSPACE_TRANSFER_TARGET_NOT_ELIGIBLE = 'WORKSPACE_TRANSFER_TARGET_NOT_ELIGIBLE',
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

export class WorkspaceInsufficientAccessError extends WorkspaceError {
  constructor(workspaceId: string, metadata?: ErrorMetadata) {
    super(
      `Insufficient access to workspace '${workspaceId}'`,
      WorkspaceErrorCode.WORKSPACE_INSUFFICIENT_ACCESS,
      403,
      { workspaceId, ...metadata },
    );
  }
}

export class WorkspaceMemberNotFoundError extends WorkspaceError {
  constructor(workspaceId: string, userId: string) {
    super(
      `User '${userId}' has no changeable access to workspace '${workspaceId}'`,
      WorkspaceErrorCode.WORKSPACE_MEMBER_NOT_FOUND,
      404,
      { workspaceId, userId },
    );
  }
}

export class WorkspaceTeamNotSharedError extends WorkspaceError {
  constructor(workspaceId: string, teamId: string) {
    super(
      `Team '${teamId}' has no access to workspace '${workspaceId}'`,
      WorkspaceErrorCode.WORKSPACE_TEAM_NOT_SHARED,
      404,
      { workspaceId, teamId },
    );
  }
}

export class InvalidWorkspaceShareTargetError extends WorkspaceError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid workspace share target: ${reason}`,
      WorkspaceErrorCode.WORKSPACE_INVALID_SHARE_TARGET,
      400,
      metadata,
    );
  }
}

export class WorkspaceOwnerOnlyError extends WorkspaceError {
  constructor(workspaceId: string) {
    super(
      `Only the owner may do this with workspace '${workspaceId}'`,
      WorkspaceErrorCode.WORKSPACE_OWNER_ONLY,
      403,
      { workspaceId },
    );
  }
}

export class WorkspaceTransferTargetNotEligibleError extends WorkspaceError {
  constructor(workspaceId: string, userId: string) {
    super(
      `User '${userId}' cannot take over workspace '${workspaceId}': they need access to it`,
      WorkspaceErrorCode.WORKSPACE_TRANSFER_TARGET_NOT_ELIGIBLE,
      422,
      { workspaceId, userId },
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
