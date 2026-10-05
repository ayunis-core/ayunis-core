import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export interface StorageFailureDiagnostics extends ErrorMetadata {
  upstreamName?: string;
  upstreamCode?: string;
  upstreamStatus?: number;
}

export enum StorageErrorCode {
  OBJECT_NOT_FOUND = 'OBJECT_NOT_FOUND',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  BUCKET_NOT_FOUND = 'BUCKET_NOT_FOUND',
  INVALID_OBJECT_NAME = 'INVALID_OBJECT_NAME',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNEXPECTED_STORAGE_ERROR = 'UNEXPECTED_STORAGE_ERROR',
}

export class StorageError extends ApplicationError {
  constructor(
    message: string,
    code: StorageErrorCode = StorageErrorCode.UPLOAD_FAILED,
    statusCode = 500,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
    this.name = 'StorageError';
  }
}

export class ObjectNotFoundError extends StorageError {
  constructor(params: {
    objectName: string;
    bucket?: string;
    metadata?: ErrorMetadata;
  }) {
    const bucketInfo = params.bucket ? ` in bucket '${params.bucket}'` : '';
    super(
      `Object '${params.objectName}' not found${bucketInfo}`,
      StorageErrorCode.OBJECT_NOT_FOUND,
      404,
      params.metadata,
    );
    this.name = 'ObjectNotFoundError';
  }
}

// Raw object names and driver messages stay out of these wrappers because
// they can contain bucket layouts or hostnames. Upload errors carry only
// allowlisted machine diagnostics; 5xx client responses remain generic.
export class UploadFailedError extends StorageError {
  constructor(params?: { diagnostics?: StorageFailureDiagnostics }) {
    super(
      formatStorageFailureMessage(
        'Failed to upload object',
        params?.diagnostics,
      ),
      StorageErrorCode.UPLOAD_FAILED,
      500,
      params?.diagnostics,
    );
    this.name = 'UploadFailedError';
  }
}

// A distinct class, not a flag on UploadFailedError: AppSignal groups
// incidents by error name, so an outage of the object store must not share
// an incident with upload bugs that need code changes.
export class StorageUnavailableError extends StorageError {
  constructor(params?: { diagnostics?: StorageFailureDiagnostics }) {
    super(
      formatStorageFailureMessage(
        'Object storage unavailable',
        params?.diagnostics,
      ),
      StorageErrorCode.STORAGE_UNAVAILABLE,
      503,
      params?.diagnostics,
    );
    this.name = 'StorageUnavailableError';
  }
}

function formatStorageFailureMessage(
  summary: string,
  diagnostics?: StorageFailureDiagnostics,
): string {
  const details = [
    diagnostics?.upstreamName,
    diagnostics?.upstreamCode && `code ${diagnostics.upstreamCode}`,
    diagnostics?.upstreamStatus && `status ${diagnostics.upstreamStatus}`,
  ].filter(Boolean);
  return details.length > 0 ? `${summary} (${details.join(', ')})` : summary;
}

export class DownloadFailedError extends StorageError {
  constructor(params?: { metadata?: ErrorMetadata }) {
    super(
      'Failed to download object',
      StorageErrorCode.DOWNLOAD_FAILED,
      500,
      params?.metadata,
    );
    this.name = 'DownloadFailedError';
  }
}

export class DeleteFailedError extends StorageError {
  constructor(params?: { metadata?: ErrorMetadata }) {
    super(
      'Failed to delete object',
      StorageErrorCode.DELETE_FAILED,
      500,
      params?.metadata,
    );
    this.name = 'DeleteFailedError';
  }
}

export class BucketNotFoundError extends StorageError {
  constructor(params: { bucket: string; metadata?: ErrorMetadata }) {
    super(
      `Bucket '${params.bucket}' not found`,
      StorageErrorCode.BUCKET_NOT_FOUND,
      404,
      params.metadata,
    );
    this.name = 'BucketNotFoundError';
  }
}

export class InvalidObjectNameError extends StorageError {
  constructor(params: { objectName: string; metadata?: ErrorMetadata }) {
    super(
      `Invalid object name: '${params.objectName}'`,
      StorageErrorCode.INVALID_OBJECT_NAME,
      400,
      params.metadata,
    );
    this.name = 'InvalidObjectNameError';
  }
}

export class UnexpectedStorageError extends StorageError {
  constructor(error: Error) {
    super(
      'Unexpected storage error',
      StorageErrorCode.UNEXPECTED_STORAGE_ERROR,
      500,
      { error },
    );
    this.name = 'UnexpectedStorageError';
  }
}

export class StoragePermissionDeniedError extends StorageError {
  constructor(params: {
    operation: string;
    objectName?: string;
    bucket?: string;
    metadata?: ErrorMetadata;
  }) {
    const objectInfo = params.objectName
      ? ` on object '${params.objectName}'`
      : '';
    const bucketInfo = params.bucket ? ` in bucket '${params.bucket}'` : '';
    super(
      `Permission denied for operation '${params.operation}'${objectInfo}${bucketInfo}`,
      StorageErrorCode.PERMISSION_DENIED,
      403,
      params.metadata,
    );
    this.name = 'StoragePermissionDeniedError';
  }
}
