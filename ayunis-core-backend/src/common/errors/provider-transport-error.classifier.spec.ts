import {
  classifyTransportError,
  isRetryableProviderServerFailure,
  isRetryableProviderTimeoutFailure,
  isRetryableSetupFailure,
} from './provider-transport-error.classifier';
import { ProviderFailureClass } from './provider.errors';

function errorWithCode(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

describe('classifyTransportError', () => {
  describe('connection failures by error code', () => {
    it.each([
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'EAI_AGAIN',
      'EHOSTUNREACH',
      'UND_ERR_SOCKET',
      'UND_ERR_CONNECT',
    ])('classifies %s as CONNECTION', (code) => {
      const result = classifyTransportError(
        errorWithCode('socket error', code),
      );
      expect(result).toEqual({
        failureClass: ProviderFailureClass.CONNECTION,
        code,
        host: undefined,
      });
    });

    it.each([
      'CERT_HAS_EXPIRED',
      'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      'SELF_SIGNED_CERT_IN_CHAIN',
      'ERR_TLS_CERT_ALTNAME_INVALID',
    ])('classifies TLS failure %s as CONNECTION', (code) => {
      const result = classifyTransportError(errorWithCode('tls error', code));
      expect(result?.failureClass).toBe(ProviderFailureClass.CONNECTION);
      expect(result?.code).toBe(code);
    });
  });

  describe('timeout failures by error code', () => {
    it.each([
      'ETIMEDOUT',
      'ERR_SOCKET_TIMEOUT',
      'UND_ERR_CONNECT_TIMEOUT',
      'UND_ERR_HEADERS_TIMEOUT',
      'UND_ERR_BODY_TIMEOUT',
    ])('classifies %s as TIMEOUT', (code) => {
      const result = classifyTransportError(errorWithCode('timed out', code));
      expect(result?.failureClass).toBe(ProviderFailureClass.TIMEOUT);
      expect(result?.code).toBe(code);
    });
  });

  describe('cause-chain traversal', () => {
    it('finds the coded error behind an undici "fetch failed" TypeError', () => {
      const cause = Object.assign(
        new Error('getaddrinfo ENOTFOUND api.mistral.ai'),
        {
          code: 'ENOTFOUND',
          hostname: 'api.mistral.ai',
        },
      );
      const wrapper = new TypeError('fetch failed', { cause });
      expect(classifyTransportError(wrapper)).toEqual({
        failureClass: ProviderFailureClass.CONNECTION,
        code: 'ENOTFOUND',
        host: 'api.mistral.ai',
      });
    });

    it('finds coded errors inside an AggregateError (multi-address connect)', () => {
      const aggregate = new AggregateError(
        [
          Object.assign(new Error('connect ECONNREFUSED ::1:443'), {
            code: 'ECONNREFUSED',
            address: '::1',
          }),
          Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:443'), {
            code: 'ECONNREFUSED',
            address: '127.0.0.1',
          }),
        ],
        'aggregate connect failure',
      );
      const wrapper = new TypeError('fetch failed', { cause: aggregate });
      const result = classifyTransportError(wrapper);
      expect(result?.failureClass).toBe(ProviderFailureClass.CONNECTION);
      expect(result?.code).toBe('ECONNREFUSED');
      expect(result?.host).toBe('::1');
    });

    it('classifies a connection-named SDK error with a timeout cause as TIMEOUT', () => {
      // Mistral SDK wraps undici timeouts in ConnectionError — the underlying
      // code is more specific than the wrapper's name.
      const cause = errorWithCode('body timeout', 'UND_ERR_BODY_TIMEOUT');
      const wrapper = Object.assign(new Error('connection error'), {
        name: 'ConnectionError',
        cause,
      });
      const result = classifyTransportError(wrapper);
      expect(result?.failureClass).toBe(ProviderFailureClass.TIMEOUT);
      expect(result?.code).toBe('UND_ERR_BODY_TIMEOUT');
    });

    it('survives circular cause chains', () => {
      const error = new Error('circular') as Error & { cause?: unknown };
      error.cause = error;
      expect(classifyTransportError(error)).toBeUndefined();
    });
  });

  describe('SDK error names without codes', () => {
    it.each([
      'APIConnectionTimeoutError', // OpenAI SDK
      'RequestTimeoutError', // Mistral SDK
      'TimeoutError', // AWS SDK / AbortSignal.timeout
    ])('classifies %s as TIMEOUT', (name) => {
      const error = Object.assign(new Error('timed out'), { name });
      expect(classifyTransportError(error)?.failureClass).toBe(
        ProviderFailureClass.TIMEOUT,
      );
    });

    it.each([
      'APIConnectionError', // OpenAI SDK
      'ConnectionError', // Mistral SDK
      'FetchError', // node-fetch
    ])('classifies %s as CONNECTION', (name) => {
      const error = Object.assign(new Error('connection failed'), { name });
      expect(classifyTransportError(error)?.failureClass).toBe(
        ProviderFailureClass.CONNECTION,
      );
    });
  });

  describe('name-matched nodes with numeric codes', () => {
    // The exact incident shape from AbortSignal.timeout: DOMException with
    // name 'TimeoutError' and numeric code 23 (AppSignal incident "23:").
    it('classifies a DOMException TimeoutError and preserves its code', () => {
      const error = new DOMException(
        'The operation was aborted due to timeout',
        'TimeoutError',
      );

      const result = classifyTransportError(error);

      expect(result?.failureClass).toBe(ProviderFailureClass.TIMEOUT);
      expect(result?.code).toBe('23');
    });
  });

  describe('isRetryableSetupFailure', () => {
    it.each(['EAI_AGAIN', 'ECONNRESET'])(
      'treats %s as retryable during request setup',
      (code) => {
        expect(isRetryableSetupFailure(errorWithCode('boom', code))).toBe(true);
      },
    );

    it('does not retry timeouts — that would double an already-long wait', () => {
      expect(
        isRetryableSetupFailure(
          errorWithCode('headers timeout', 'UND_ERR_HEADERS_TIMEOUT'),
        ),
      ).toBe(false);
    });

    it('does not retry non-transport errors', () => {
      expect(isRetryableSetupFailure(new Error('boom'))).toBe(false);
    });

    it('does not retry client aborts', () => {
      expect(
        isRetryableSetupFailure(
          new DOMException('The operation was aborted', 'AbortError'),
        ),
      ).toBe(false);
    });
  });

  describe('provider timeout failures', () => {
    it('accepts classified timeout errors', () => {
      expect(
        isRetryableProviderTimeoutFailure(
          errorWithCode('request timed out', 'ETIMEDOUT'),
        ),
      ).toBe(true);
    });

    it.each([408, 504])('accepts upstream timeout status %s', (status) => {
      expect(
        isRetryableProviderTimeoutFailure(
          Object.assign(new Error('upstream timed out'), { status }),
        ),
      ).toBe(true);
    });

    it('rejects connection failures', () => {
      expect(
        isRetryableProviderTimeoutFailure(
          errorWithCode('connection refused', 'ECONNREFUSED'),
        ),
      ).toBe(false);
    });
  });

  describe('provider server failures', () => {
    it('accepts upstream 5xx status shapes', () => {
      expect(
        isRetryableProviderServerFailure(
          Object.assign(new Error('service unavailable'), { status: 503 }),
        ),
      ).toBe(true);
    });

    it.each([429, 504])('rejects non-server status %s', (status) => {
      expect(
        isRetryableProviderServerFailure(
          Object.assign(new Error('not a server retry'), { status }),
        ),
      ).toBe(false);
    });
  });

  describe('non-transport errors', () => {
    it('returns undefined for a plain Error', () => {
      expect(classifyTransportError(new Error('boom'))).toBeUndefined();
    });

    it('returns undefined for client aborts (AbortError stays a cancellation)', () => {
      const abort = new DOMException('The operation was aborted', 'AbortError');
      expect(classifyTransportError(abort)).toBeUndefined();
    });

    it('returns undefined for provider HTTP errors without transport codes', () => {
      const error = Object.assign(new Error('rate limited'), { status: 429 });
      expect(classifyTransportError(error)).toBeUndefined();
    });

    it('returns undefined for non-object inputs', () => {
      expect(classifyTransportError(null)).toBeUndefined();
      expect(classifyTransportError(undefined)).toBeUndefined();
      expect(classifyTransportError('ECONNRESET')).toBeUndefined();
    });
  });
});
