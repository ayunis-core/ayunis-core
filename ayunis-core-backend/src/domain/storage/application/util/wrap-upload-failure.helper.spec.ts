import {
  StorageUnavailableError,
  UploadFailedError,
} from 'src/domain/storage/application/storage.errors';
import { wrapUploadFailure } from './wrap-upload-failure.helper';

// Mirrors what the minio SDK actually throws: S3Error with `code` and the
// x-amz-* headers copied onto the instance, and no HTTP status field.
function s3Error(code: string, message: string): Error {
  const error = Object.assign(new Error(message), {
    code,
    amzRequestid: 'sensitive-request-id',
    amzId2: 'sensitive-host-token',
  });
  error.name = 'S3Error';
  return error;
}

describe('wrapUploadFailure', () => {
  it('keeps a rejected S3 request as UploadFailedError with safe diagnostics', () => {
    const wrapped = wrapUploadFailure(
      s3Error('AccessDenied', 'denied for sensitive-bucket/private/object.png'),
    );

    expect(wrapped).toBeInstanceOf(UploadFailedError);
    expect(wrapped.statusCode).toBe(500);
    expect(wrapped.message).toBe(
      'Failed to upload object (S3Error, code AccessDenied)',
    );
    expect(wrapped.metadata).toEqual({
      upstreamName: 'S3Error',
      upstreamCode: 'AccessDenied',
    });
  });

  it('classifies a throttled S3 server as StorageUnavailableError', () => {
    const wrapped = wrapUploadFailure(
      s3Error('SlowDown', 'Please reduce your request rate.'),
    );

    expect(wrapped).toBeInstanceOf(StorageUnavailableError);
    expect(wrapped.statusCode).toBe(503);
    expect(wrapped.message).toBe(
      'Object storage unavailable (S3Error, code SlowDown)',
    );
  });

  it('classifies a refused connection as StorageUnavailableError', () => {
    const wrapped = wrapUploadFailure(
      Object.assign(new Error('connect ECONNREFUSED minio.internal:9000'), {
        code: 'ECONNREFUSED',
        hostname: 'minio.internal',
        port: 9000,
      }),
    );

    expect(wrapped).toBeInstanceOf(StorageUnavailableError);
    expect(wrapped.metadata).toEqual({
      upstreamName: 'Error',
      upstreamCode: 'ECONNREFUSED',
    });
    expect(wrapped.message).not.toContain('minio.internal');
  });

  it('classifies an upstream 5xx status from an S3-compatible SDK', () => {
    const wrapped = wrapUploadFailure(
      Object.assign(new Error('internal'), {
        $metadata: { httpStatusCode: 502 },
      }),
    );

    expect(wrapped).toBeInstanceOf(StorageUnavailableError);
    expect(wrapped.metadata).toEqual({
      upstreamName: 'Error',
      upstreamStatus: 502,
    });
  });

  it('never copies request ids, SDK messages, or unsafe tokens', () => {
    const wrapped = wrapUploadFailure(
      Object.assign(new Error('path /sensitive-bucket/object'), {
        code: 'bad code with spaces/and/slashes',
        amzRequestid: 'sensitive-request-id',
      }),
    );

    expect(wrapped.metadata).toEqual({ upstreamName: 'Error' });
    expect(wrapped.message).toBe('Failed to upload object (Error)');
  });

  it('returns a bare UploadFailedError for non-object throwables', () => {
    const wrapped = wrapUploadFailure('boom');

    expect(wrapped).toBeInstanceOf(UploadFailedError);
    expect(wrapped.metadata).toBeUndefined();
    expect(wrapped.message).toBe('Failed to upload object');
  });

  it.each([
    [new UploadFailedError(), 'UPLOAD_FAILED'],
    [new StorageUnavailableError(), 'STORAGE_UNAVAILABLE'],
  ])('%s responds to clients with a generic 5xx body', (error, code) => {
    expect(error.toClientResponse()).toEqual({
      code,
      message: 'Internal server error',
    });
  });
});
