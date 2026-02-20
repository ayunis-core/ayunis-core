import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum StorageErrorCode {
  OBJECT_NOT_FOUND = 'OBJECT_NOT_FOUND',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  BUCKET_NOT_FOUND = 'BUCKET_NOT_FOUND',
  INVALID_OBJECT_NAME = 'INVALID_OBJECT_NAME',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
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

export class UploadFailedError extends StorageError {
  constructor(params: {
    objectName: string;
    message: string;
    metadata?: ErrorMetadata;
  }) {
    super(
      `Failed to upload object '${params.objectName}': ${params.message}`,
      StorageErrorCode.UPLOAD_FAILED,
      500,
      params.metadata,
    );
    this.name = 'UploadFailedError';
  }
}

export class DownloadFailedError extends StorageError {
  constructor(params: {
    objectName: string;
    message: string;
    metadata?: ErrorMetadata;
  }) {
    super(
      `Failed to download object '${params.objectName}': ${params.message}`,
      StorageErrorCode.DOWNLOAD_FAILED,
      500,
      params.metadata,
    );
    this.name = 'DownloadFailedError';
  }
}

export class DeleteFailedError extends StorageError {
  constructor(params: {
    objectName: string;
    message: string;
    metadata?: ErrorMetadata;
  }) {
    super(
      `Failed to delete object '${params.objectName}': ${params.message}`,
      StorageErrorCode.DELETE_FAILED,
      500,
      params.metadata,
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
