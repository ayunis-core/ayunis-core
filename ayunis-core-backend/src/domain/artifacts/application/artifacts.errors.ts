import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';

export enum ArtifactErrorCode {
  ARTIFACT_NOT_FOUND = 'ARTIFACT_NOT_FOUND',
  ARTIFACT_VERSION_NOT_FOUND = 'ARTIFACT_VERSION_NOT_FOUND',
  ARTIFACT_VERSION_CONFLICT = 'ARTIFACT_VERSION_CONFLICT',
  ARTIFACT_CONTENT_TOO_LARGE = 'ARTIFACT_CONTENT_TOO_LARGE',
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

export class ArtifactContentTooLargeError extends ArtifactError {
  constructor(
    contentSizeBytes: number,
    maxSizeBytes: number,
    metadata?: ErrorMetadata,
  ) {
    super(
      `Artifact content size (${contentSizeBytes} bytes) exceeds maximum (${maxSizeBytes} bytes)`,
      ArtifactErrorCode.ARTIFACT_CONTENT_TOO_LARGE,
      400,
      { contentSizeBytes, maxSizeBytes, ...metadata },
    );
  }
}
