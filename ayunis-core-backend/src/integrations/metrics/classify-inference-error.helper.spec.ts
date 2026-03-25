import { classifyInferenceError } from './classify-inference-error.helper';

describe('classifyInferenceError', () => {
  describe('timeout errors', () => {
    it('should classify "timeout" message as timeout', () => {
      expect(classifyInferenceError(new Error('Request timeout'))).toBe(
        'timeout',
      );
    });

    it('should classify "timed out" message as timeout', () => {
      expect(classifyInferenceError(new Error('Connection timed out'))).toBe(
        'timeout',
      );
    });

    it('should classify status 408 as timeout', () => {
      const error = Object.assign(new Error('Request Timeout'), {
        status: 408,
      });
      expect(classifyInferenceError(error)).toBe('timeout');
    });

    it('should classify status 504 as timeout', () => {
      const error = Object.assign(new Error('Gateway Timeout'), {
        status: 504,
      });
      expect(classifyInferenceError(error)).toBe('timeout');
    });

    it('should classify "408" in message as timeout', () => {
      expect(
        classifyInferenceError(new Error('HTTP 408 Request Timeout')),
      ).toBe('timeout');
    });

    it('should classify "504" in message as timeout', () => {
      expect(
        classifyInferenceError(new Error('HTTP 504 Gateway Timeout')),
      ).toBe('timeout');
    });
  });

  describe('rate limit errors', () => {
    it('should classify "rate limit" message as rate_limit', () => {
      expect(classifyInferenceError(new Error('Rate limit exceeded'))).toBe(
        'rate_limit',
      );
    });

    it('should classify status 429 as rate_limit', () => {
      const error = Object.assign(new Error('Too many requests'), {
        status: 429,
      });
      expect(classifyInferenceError(error)).toBe('rate_limit');
    });
  });

  describe('server errors', () => {
    it('should classify "503" in message as server_error', () => {
      expect(classifyInferenceError(new Error('503 Service Unavailable'))).toBe(
        'server_error',
      );
    });

    it('should classify "502" in message as server_error', () => {
      expect(classifyInferenceError(new Error('502 Bad Gateway'))).toBe(
        'server_error',
      );
    });

    it('should classify "500" in message as server_error', () => {
      expect(
        classifyInferenceError(new Error('500 Internal Server Error')),
      ).toBe('server_error');
    });

    it('should classify status 500 as server_error', () => {
      const error = Object.assign(new Error('Internal Server Error'), {
        status: 500,
      });
      expect(classifyInferenceError(error)).toBe('server_error');
    });

    it('should classify status 502 as server_error', () => {
      const error = Object.assign(new Error('Bad Gateway'), { status: 502 });
      expect(classifyInferenceError(error)).toBe('server_error');
    });

    it('should classify status 503 as server_error', () => {
      const error = Object.assign(new Error('Unavailable'), { status: 503 });
      expect(classifyInferenceError(error)).toBe('server_error');
    });

    it('should NOT classify message containing "502" as substring in a number', () => {
      expect(
        classifyInferenceError(new Error('processed 50200 items')),
      ).not.toBe('server_error');
    });

    it('should NOT classify message containing "500" as substring in a number', () => {
      expect(
        classifyInferenceError(new Error('processed 50000 items')),
      ).not.toBe('server_error');
    });
  });

  describe('auth errors', () => {
    it('should classify status 401 as auth_error', () => {
      const error = Object.assign(new Error('Unauthorized'), { status: 401 });
      expect(classifyInferenceError(error)).toBe('auth_error');
    });

    it('should classify status 403 as auth_error', () => {
      const error = Object.assign(new Error('Forbidden'), { status: 403 });
      expect(classifyInferenceError(error)).toBe('auth_error');
    });

    it('should classify "401" in message as auth_error', () => {
      expect(classifyInferenceError(new Error('HTTP 401 Unauthorized'))).toBe(
        'auth_error',
      );
    });

    it('should classify "403" in message as auth_error', () => {
      expect(classifyInferenceError(new Error('HTTP 403 Forbidden'))).toBe(
        'auth_error',
      );
    });

    it('should classify code property 401 as auth_error', () => {
      const error = { code: 401, message: 'Unauthorized' };
      expect(classifyInferenceError(error)).toBe('auth_error');
    });

    it('should NOT classify message containing "403" as substring in a number', () => {
      expect(
        classifyInferenceError(new Error('token count 14032 exceeds limit')),
      ).not.toBe('auth_error');
    });

    it('should NOT classify message containing "401" as substring in a number', () => {
      expect(
        classifyInferenceError(new Error('request id 94013 failed')),
      ).not.toBe('auth_error');
    });
  });

  describe('context length errors', () => {
    it('should classify "context length" message as context_length', () => {
      expect(
        classifyInferenceError(
          new Error("This model's maximum context length is 4096 tokens"),
        ),
      ).toBe('context_length');
    });

    it('should classify "context_length" message as context_length', () => {
      expect(classifyInferenceError(new Error('context_length_exceeded'))).toBe(
        'context_length',
      );
    });

    it('should classify "too many tokens" as context_length', () => {
      expect(
        classifyInferenceError(new Error('Too many tokens in request')),
      ).toBe('context_length');
    });

    it('should classify "maximum context" as context_length', () => {
      expect(
        classifyInferenceError(new Error('Exceeded maximum context window')),
      ).toBe('context_length');
    });
  });

  describe('content policy errors', () => {
    it('should classify "content policy" message as content_policy', () => {
      expect(
        classifyInferenceError(new Error('Content policy violation')),
      ).toBe('content_policy');
    });

    it('should classify "content_policy" message as content_policy', () => {
      expect(
        classifyInferenceError(new Error('content_policy_violation')),
      ).toBe('content_policy');
    });

    it('should classify "content filter" as content_policy', () => {
      expect(
        classifyInferenceError(new Error('Blocked by content filter')),
      ).toBe('content_policy');
    });

    it('should classify "content moderation" as content_policy', () => {
      expect(
        classifyInferenceError(new Error('Flagged by content moderation')),
      ).toBe('content_policy');
    });
  });

  describe('connection errors', () => {
    it('should classify ECONNREFUSED as connection_error', () => {
      expect(
        classifyInferenceError(new Error('connect ECONNREFUSED 127.0.0.1')),
      ).toBe('connection_error');
    });

    it('should classify ECONNRESET as connection_error', () => {
      expect(classifyInferenceError(new Error('read ECONNRESET'))).toBe(
        'connection_error',
      );
    });
  });

  describe('unknown errors', () => {
    it('should return unknown for non-Error values', () => {
      expect(classifyInferenceError('string error')).toBe('unknown');
    });

    it('should return unknown for null', () => {
      expect(classifyInferenceError(null)).toBe('unknown');
    });

    it('should return unknown for undefined', () => {
      expect(classifyInferenceError(undefined)).toBe('unknown');
    });

    it('should return unknown for unrecognized error messages', () => {
      expect(classifyInferenceError(new Error('Something went wrong'))).toBe(
        'unknown',
      );
    });
  });

  describe('structured error objects with status/code', () => {
    it('should prioritize status code over message content', () => {
      const error = Object.assign(new Error('Request timeout'), {
        status: 401,
      });
      expect(classifyInferenceError(error)).toBe('auth_error');
    });

    it('should handle plain objects with status property', () => {
      expect(classifyInferenceError({ status: 429 })).toBe('rate_limit');
    });

    it('should handle plain objects with code property', () => {
      expect(classifyInferenceError({ code: 503 })).toBe('server_error');
    });

    it('should classify plain object with message property via message rules', () => {
      expect(
        classifyInferenceError({
          status: 418,
          message: 'rate limit exceeded',
        }),
      ).toBe('rate_limit');
    });

    it('should classify plain object with message but no status code', () => {
      expect(classifyInferenceError({ message: 'Connection timed out' })).toBe(
        'timeout',
      );
    });

    it('should return unknown for plain object without message property', () => {
      expect(classifyInferenceError({ foo: 'bar' })).toBe('unknown');
    });
  });
});
