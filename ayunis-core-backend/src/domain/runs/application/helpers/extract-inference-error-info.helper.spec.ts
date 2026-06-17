import { ApplicationError } from 'src/common/errors/base.error';
import { extractInferenceErrorInfo } from './extract-inference-error-info.helper';

class TestDomainError extends ApplicationError {
  constructor(statusCode: number, metadata?: Record<string, unknown>) {
    super('domain failure', 'TEST_DOMAIN_ERROR', statusCode, metadata);
  }
}

describe('extractInferenceErrorInfo', () => {
  it('should extract message from Error instance', () => {
    const result = extractInferenceErrorInfo(new Error('something broke'));

    expect(result).toEqual({
      message: 'something broke',
      statusCode: undefined,
    });
  });

  it('should extract message and status from Error with status property', () => {
    const error = Object.assign(new Error('Too Many Requests'), {
      status: 429,
    });

    const result = extractInferenceErrorInfo(error);

    expect(result).toEqual({
      message: 'Too Many Requests',
      statusCode: 429,
    });
  });

  it('should extract message and statusCode from Error with statusCode property', () => {
    const error = Object.assign(new Error('Internal Server Error'), {
      statusCode: 500,
    });

    const result = extractInferenceErrorInfo(error);

    expect(result).toEqual({
      message: 'Internal Server Error',
      statusCode: 500,
    });
  });

  it('should handle plain object with message and status', () => {
    const error = { message: 'rate limited', status: 429 };

    const result = extractInferenceErrorInfo(error);

    expect(result).toEqual({
      message: 'rate limited',
      statusCode: 429,
    });
  });

  it('should handle plain object with message and statusCode', () => {
    const error = { message: 'server error', statusCode: 500 };

    const result = extractInferenceErrorInfo(error);

    expect(result).toEqual({
      message: 'server error',
      statusCode: 500,
    });
  });

  it('should stringify object without message property', () => {
    const error = { code: 'TIMEOUT', detail: 'request timed out' };

    const result = extractInferenceErrorInfo(error);

    expect(result.message).toBe(JSON.stringify(error));
    expect(result.statusCode).toBeUndefined();
  });

  it('should stringify non-object, non-Error exceptions', () => {
    expect(extractInferenceErrorInfo('string error')).toEqual({
      message: 'string error',
    });

    expect(extractInferenceErrorInfo(42)).toEqual({
      message: '42',
    });

    expect(extractInferenceErrorInfo(null)).toEqual({
      message: 'null',
    });

    expect(extractInferenceErrorInfo(undefined)).toEqual({
      message: 'undefined',
    });
  });

  it('prefers metadata.status over a direct statusCode field', () => {
    // Simulates the shape of InferenceFailedError (ApplicationError) after
    // Get/StreamInferenceUseCase wraps a provider 429: ApplicationError sets
    // .statusCode = 500 (HTTP), while the upstream status is stashed in
    // metadata.status.
    const wrapped = Object.assign(
      new Error('Inference failed: Provider inference failed'),
      {
        statusCode: 500,
        metadata: { status: 429 },
      },
    );

    const result = extractInferenceErrorInfo(wrapped);

    expect(result).toEqual({
      message: 'Inference failed: Provider inference failed',
      statusCode: 429,
    });
  });

  it('falls back to response.status for fetch-style errors', () => {
    const error = Object.assign(new Error('unauthorized'), {
      response: { status: 401 },
    });

    expect(extractInferenceErrorInfo(error)).toEqual({
      message: 'unauthorized',
      statusCode: 401,
    });
  });

  it('falls back to $metadata.httpStatusCode for AWS / Bedrock errors', () => {
    const error = Object.assign(new Error('throttled'), {
      $metadata: { httpStatusCode: 429 },
    });

    expect(extractInferenceErrorInfo(error)).toEqual({
      message: 'throttled',
      statusCode: 429,
    });
  });

  it('ignores ApplicationError.statusCode when no metadata.status is set', () => {
    // A non-wrapped ApplicationError (e.g., ModelProviderNotSupportedError
    // from the registry) carries its outbound HTTP code in `.statusCode`.
    // We must not surface that as the upstream provider's status.
    const result = extractInferenceErrorInfo(new TestDomainError(400));

    expect(result).toEqual({
      message: 'domain failure',
      statusCode: undefined,
    });
  });

  it('honours metadata.status on an ApplicationError (true wrapped upstream)', () => {
    // InferenceFailedError shape: ApplicationError with metadata.status set
    // by the use-case wrapper.
    const result = extractInferenceErrorInfo(
      new TestDomainError(500, { status: 429 }),
    );

    expect(result).toEqual({
      message: 'domain failure',
      statusCode: 429,
    });
  });
});
