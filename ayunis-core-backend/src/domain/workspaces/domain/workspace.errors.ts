import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum WorkspaceDomainErrorCode {
  WORKSPACE_INVALID_NAME = 'WORKSPACE_INVALID_NAME',
  WORKSPACE_INVALID_DESCRIPTION = 'WORKSPACE_INVALID_DESCRIPTION',
}

export class InvalidWorkspaceNameError extends ApplicationError {
  constructor(name: string, metadata?: ErrorMetadata) {
    super(
      `Invalid workspace name "${name}". Names must not be empty, must not ` +
        `exceed the maximum length, must not start or end with whitespace, ` +
        `and must not contain control characters.`,
      WorkspaceDomainErrorCode.WORKSPACE_INVALID_NAME,
      400,
      metadata,
    );
  }
}

export class InvalidWorkspaceDescriptionError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Invalid workspace description: exceeds the maximum length.',
      WorkspaceDomainErrorCode.WORKSPACE_INVALID_DESCRIPTION,
      400,
      metadata,
    );
  }
}
