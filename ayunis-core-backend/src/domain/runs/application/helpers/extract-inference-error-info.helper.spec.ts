import { extractInferenceErrorInfo } from './extract-inference-error-info.helper';

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
});
