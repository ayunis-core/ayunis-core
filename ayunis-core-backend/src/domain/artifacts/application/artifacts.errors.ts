import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';

/** Maximum allowed artifact content length in characters (~500 KB). */
export const ARTIFACT_MAX_CONTENT_LENGTH = 512_000;

export const MAX_SPREADSHEET_COLUMNS = 100;
export const MAX_SPREADSHEET_ROWS = 5000;
export const MAX_SPREADSHEET_FORMULA_LENGTH = 500;

export enum ArtifactErrorCode {
  ARTIFACT_NOT_FOUND = 'ARTIFACT_NOT_FOUND',
  ARTIFACT_VERSION_NOT_FOUND = 'ARTIFACT_VERSION_NOT_FOUND',
  ARTIFACT_VERSION_CONFLICT = 'ARTIFACT_VERSION_CONFLICT',
  ARTIFACT_EXPECTED_VERSION_MISMATCH = 'ARTIFACT_EXPECTED_VERSION_MISMATCH',
  ARTIFACT_CONTENT_TOO_LARGE = 'ARTIFACT_CONTENT_TOO_LARGE',
  ARTIFACT_EDIT_NOT_FOUND = 'ARTIFACT_EDIT_NOT_FOUND',
  ARTIFACT_EDIT_AMBIGUOUS = 'ARTIFACT_EDIT_AMBIGUOUS',
  ARTIFACT_LETTERHEAD_NOT_SUPPORTED = 'ARTIFACT_LETTERHEAD_NOT_SUPPORTED',
  ARTIFACT_NOT_EXPORTABLE = 'ARTIFACT_NOT_EXPORTABLE',
  ARTIFACT_INVALID_SPREADSHEET_CONTENT = 'ARTIFACT_INVALID_SPREADSHEET_CONTENT',
  ARTIFACT_EXPORT_TIMEOUT = 'ARTIFACT_EXPORT_TIMEOUT',
  ARTIFACT_UNKNOWN_PLACEHOLDER = 'ARTIFACT_UNKNOWN_PLACEHOLDER',
  ARTIFACT_OUTSIDE_CHAT_SCOPE = 'ARTIFACT_OUTSIDE_CHAT_SCOPE',
  ARTIFACT_CHAT_MODE_MISMATCH = 'ARTIFACT_CHAT_MODE_MISMATCH',
  ARTIFACT_UNEXPECTED = 'ARTIFACT_UNEXPECTED',
}

export abstract class ArtifactError extends ApplicationError {
  constructor(
    message: string,
    code: ArtifactErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class ArtifactNotFoundError extends ArtifactError {
  constructor(artifactId: string, metadata?: ErrorMetadata) {
    super(
      `Artifact with ID '${artifactId}' not found`,
      ArtifactErrorCode.ARTIFACT_NOT_FOUND,
      404,
      { artifactId, ...metadata },
    );
  }
}

export class ArtifactVersionNotFoundError extends ArtifactError {
  constructor(
    artifactId: string,
    versionNumber: number,
    metadata?: ErrorMetadata,
  ) {
    super(
      `Version ${versionNumber} not found for artifact '${artifactId}'`,
      ArtifactErrorCode.ARTIFACT_VERSION_NOT_FOUND,
      404,
      { artifactId, versionNumber, ...metadata },
    );
  }
}

export class ArtifactVersionConflictError extends ArtifactError {
  constructor(artifactId: string, metadata?: ErrorMetadata) {
    super(
      `Concurrent version conflict for artifact '${artifactId}'. Please retry.`,
      ArtifactErrorCode.ARTIFACT_VERSION_CONFLICT,
      409,
      { artifactId, ...metadata },
    );
  }
}

const READ_TOOL_BY_ARTIFACT_TYPE: Record<ArtifactType, string> = {
  [ArtifactType.DOCUMENT]: 'read_document',
  [ArtifactType.DIAGRAM]: 'read_diagram',
  [ArtifactType.SPREADSHEET]: 'read_spreadsheet',
};

export class ArtifactExpectedVersionMismatchError extends ArtifactError {
  constructor(
    artifact: { id: string; type: ArtifactType },
    expectedVersion: number,
    actualVersion: number,
    metadata?: ErrorMetadata,
  ) {
    super(
      `Version conflict: you expected version ${expectedVersion} but the ${artifact.type} is at version ${actualVersion}. ` +
        `The ${artifact.type} has been edited since you last saw it. ` +
        `Use ${READ_TOOL_BY_ARTIFACT_TYPE[artifact.type]} to get the current content and version, then apply your change to that content and retry.`,
      ArtifactErrorCode.ARTIFACT_EXPECTED_VERSION_MISMATCH,
      409,
      {
        artifactId: artifact.id,
        artifactType: artifact.type,
        expectedVersion,
        actualVersion,
        ...metadata,
      },
    );
  }
}

export class ArtifactContentTooLargeError extends ArtifactError {
  constructor(
    contentLength: number,
    maxLength: number,
    metadata?: ErrorMetadata,
  ) {
    super(
      `Artifact content length (${contentLength} characters) exceeds maximum (${maxLength} characters)`,
      ArtifactErrorCode.ARTIFACT_CONTENT_TOO_LARGE,
      400,
      { contentLength, maxLength, ...metadata },
    );
  }
}

export class ArtifactEditNotFoundError extends ArtifactError {
  constructor(editIndex: number, oldText: string, metadata?: ErrorMetadata) {
    const preview =
      oldText.length > 80 ? oldText.substring(0, 80) + '…' : oldText;
    super(
      `Edit ${editIndex}: old_text not found in document: "${preview}"`,
      ArtifactErrorCode.ARTIFACT_EDIT_NOT_FOUND,
      400,
      { editIndex, ...metadata },
    );
  }
}

export class ArtifactEditAmbiguousError extends ArtifactError {
  constructor(editIndex: number, oldText: string, metadata?: ErrorMetadata) {
    const preview =
      oldText.length > 80 ? oldText.substring(0, 80) + '…' : oldText;
    super(
      `Edit ${editIndex}: old_text matches multiple locations in the document. Include more surrounding context to make it unambiguous: "${preview}"`,
      ArtifactErrorCode.ARTIFACT_EDIT_AMBIGUOUS,
      400,
      { editIndex, ...metadata },
    );
  }
}

export class ArtifactLetterheadNotSupportedError extends ArtifactError {
  constructor(artifactType: string, metadata?: ErrorMetadata) {
    super(
      `Letterheads are not supported for artifacts of type '${artifactType}'`,
      ArtifactErrorCode.ARTIFACT_LETTERHEAD_NOT_SUPPORTED,
      400,
      { artifactType, ...metadata },
    );
  }
}

export class ArtifactNotExportableError extends ArtifactError {
  constructor(artifactType: string, metadata?: ErrorMetadata) {
    super(
      `Artifacts of type '${artifactType}' cannot be exported server-side`,
      ArtifactErrorCode.ARTIFACT_NOT_EXPORTABLE,
      400,
      { artifactType, ...metadata },
    );
  }
}

export class InvalidSpreadsheetContentError extends ArtifactError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid spreadsheet content: ${reason}`,
      ArtifactErrorCode.ARTIFACT_INVALID_SPREADSHEET_CONTENT,
      400,
      metadata,
    );
  }
}

export class ArtifactExportTimeoutError extends ArtifactError {
  constructor(cause: Error) {
    super(
      'Artifact export timed out',
      ArtifactErrorCode.ARTIFACT_EXPORT_TIMEOUT,
      504,
    );
    this.cause = cause;
  }
}

/**
 * An anonymous run wrote a `{{pii:…}}` placeholder its chat has no value for,
 * so there is nothing to store in its place. The message names only the
 * placeholders, never a value, and tells the model how to retry.
 */
export class ArtifactUnknownPlaceholderError extends ArtifactError {
  constructor(tokens: string[], metadata?: ErrorMetadata) {
    super(
      `Nothing was saved: these placeholders do not exist in this conversation: ${tokens.join(', ')}. ` +
        'Only use {{pii:…}} placeholders that appear in this conversation, then retry.',
      ArtifactErrorCode.ARTIFACT_UNKNOWN_PLACEHOLDER,
      400,
      { placeholderCount: tokens.length, ...metadata },
    );
  }
}

export class ArtifactOutsideChatScopeError extends ArtifactError {
  constructor(artifactId: string, threadId: string, metadata?: ErrorMetadata) {
    super(
      `Artifact '${artifactId}' cannot be attached to chat '${threadId}': a personal chat only takes the user's personal artifacts, a workspace chat only that workspace's artifacts`,
      ArtifactErrorCode.ARTIFACT_OUTSIDE_CHAT_SCOPE,
      400,
      { artifactId, threadId, ...metadata },
    );
  }
}

export class ArtifactChatModeMismatchError extends ArtifactError {
  constructor(artifactId: string, threadId: string, metadata?: ErrorMetadata) {
    super(
      `Artifact '${artifactId}' cannot be attached to chat '${threadId}': anonymous chats only take anonymous artifacts, normal chats only normal artifacts`,
      ArtifactErrorCode.ARTIFACT_CHAT_MODE_MISMATCH,
      400,
      { artifactId, threadId, ...metadata },
    );
  }
}

export class UnexpectedArtifactError extends ArtifactError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      'Unexpected artifact error',
      ArtifactErrorCode.ARTIFACT_UNEXPECTED,
      500,
      metadata,
    );
    this.cause = error;
  }
}
