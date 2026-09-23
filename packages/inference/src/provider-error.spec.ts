import { describe, expect, it } from 'vitest';

import {
  ModelProviderError,
  normalizeProviderError,
  normalizeProviderStreamErrors,
  type ProviderFailureKind,
} from './index';

const ESTABLISHMENT = { stage: 'stream_establishment' } as const;

describe('normalizeProviderError', () => {
  it.each([
    [{ status: 503 }, 503, 'server'],
    [{ statusCode: 429 }, 429, 'rate_limit'],
    [{ status_code: 422 }, 422, 'rejection'],
    [{ response: { status: 408 } }, 408, 'timeout'],
    [{ $metadata: { httpStatusCode: 504 } }, 504, 'timeout'],
  ] as const)(
    'extracts upstream status from %#',
    (sdkError, upstreamStatus, kind) => {
      const error = normalizeProviderError(sdkError, ESTABLISHMENT);

      expect(error).toMatchObject({ kind, upstreamStatus });
    },
  );

  it.each([
    [400, 'rejection'],
    [401, 'rejection'],
    [408, 'timeout'],
    [429, 'rate_limit'],
    [499, 'rejection'],
    [500, 'server'],
    [504, 'timeout'],
    [599, 'server'],
    [399, 'unknown'],
    [600, 'unknown'],
  ] satisfies ReadonlyArray<readonly [number, ProviderFailureKind]>)(
    'classifies status %i as %s',
    (status, kind) => {
      expect(normalizeProviderError({ status }, ESTABLISHMENT).kind).toBe(kind);
    },
  );

  it.each([
    [{ request_id: 'req_snake' }, 'req_snake'],
    [{ requestId: 'req_camel' }, 'req_camel'],
    [{ requestID: 'req_caps' }, 'req_caps'],
    [{ _request_id: 'req_anthropic' }, 'req_anthropic'],
    [{ $metadata: { requestId: 'req_aws' } }, 'req_aws'],
    [{ headers: { 'X-Request-ID': 'req_header' } }, 'req_header'],
    [
      {
        response: { headers: new Headers({ 'apim-request-id': 'req_azure' }) },
      },
      'req_azure',
    ],
  ] as const)('extracts request IDs from %#', (sdkError, upstreamRequestId) => {
    expect(
      normalizeProviderError(sdkError, ESTABLISHMENT).upstreamRequestId,
    ).toBe(upstreamRequestId);
  });

  it('rejects unsafe request IDs', () => {
    const error = normalizeProviderError(
      { request_id: 'request id containing spaces' },
      ESTABLISHMENT,
    );

    expect(error.upstreamRequestId).toBeUndefined();
  });

  it.each([
    [{ headers: { 'retry-after': 2.5 } }, 2_500],
    [{ headers: { 'Retry-After': '3' } }, 3_000],
    [
      { response: { headers: new Headers({ 'retry-after-ms': '1250' }) } },
      1_250,
    ],
  ] as const)('extracts retry timing from %#', (sdkError, retryAfterMs) => {
    expect(normalizeProviderError(sdkError, ESTABLISHMENT).retryAfterMs).toBe(
      retryAfterMs,
    );
  });

  it('prefers retry-after-ms over retry-after seconds', () => {
    const error = normalizeProviderError(
      { headers: { 'retry-after': '10', 'retry-after-ms': '750' } },
      ESTABLISHMENT,
    );

    expect(error.retryAfterMs).toBe(750);
  });

  it.each([
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
    'EPIPE',
    'UND_ERR_SOCKET',
  ])('classifies transport code %s as a connection failure', (code) => {
    const error = normalizeProviderError(
      new Error('fetch failed', { cause: { code } }),
      ESTABLISHMENT,
    );

    expect(error.kind).toBe('connection');
  });

  it.each([
    'ETIMEDOUT',
    'ERR_SOCKET_TIMEOUT',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_BODY_TIMEOUT',
  ])('classifies transport code %s as a timeout', (code) => {
    const error = normalizeProviderError(
      { code },
      { ...ESTABLISHMENT, timeoutSource: 'response_start' },
    );

    expect(error).toMatchObject({
      kind: 'timeout',
      timeoutSource: 'transport',
    });
  });

  it.each([408, 504])(
    'does not assign an adapter timeout source to upstream status %i',
    (status) => {
      const error = normalizeProviderError(
        { status },
        { ...ESTABLISHMENT, timeoutSource: 'response_start' },
      );

      expect(error).toMatchObject({ kind: 'timeout' });
      expect(error.timeoutSource).toBeUndefined();
    },
  );

  it('uses an adapter timeout hint for an SDK timeout wrapper', () => {
    const error = normalizeProviderError(
      { name: 'APIConnectionTimeoutError' },
      { ...ESTABLISHMENT, timeoutSource: 'response_start' },
    );

    expect(error).toMatchObject({
      kind: 'timeout',
      timeoutSource: 'response_start',
    });
  });

  it.each([
    ['ECONNRESET', 'connection'],
    ['ETIMEDOUT', 'timeout'],
  ] satisfies ReadonlyArray<readonly [string, ProviderFailureKind]>)(
    'prefers transport code %s over a synthesized HTTP status',
    (code, kind) => {
      const error = normalizeProviderError(
        { code, status: 500 },
        ESTABLISHMENT,
      );

      expect(error.kind).toBe(kind);
    },
  );

  it.each([
    ['APIConnectionError', 'connection'],
    ['ConnectionError', 'connection'],
    ['FetchError', 'connection'],
    ['APIConnectionTimeoutError', 'timeout'],
    ['RequestTimeoutError', 'timeout'],
    ['TimeoutError', 'timeout'],
  ] satisfies ReadonlyArray<readonly [string, ProviderFailureKind]>)(
    'classifies SDK error class %s as %s',
    (name, kind) => {
      const error = normalizeProviderError({ name }, ESTABLISHMENT);

      expect(error.kind).toBe(kind);
    },
  );

  it('uses an SDK error constructor name when its Error name is generic', () => {
    class APIConnectionError extends Error {}

    expect(
      normalizeProviderError(new APIConnectionError(), ESTABLISHMENT).kind,
    ).toBe('connection');
  });

  it('classifies an SDK AbortError as an abort', () => {
    expect(
      normalizeProviderError(
        new DOMException('operation aborted', 'AbortError'),
        ESTABLISHMENT,
      ).kind,
    ).toBe('abort');
  });

  it('classifies an APIUserAbortError without a cause as an abort', () => {
    const error = normalizeProviderError(
      { name: 'APIUserAbortError' },
      ESTABLISHMENT,
    );

    expect(error.kind).toBe('abort');
  });

  it('recognizes an APIUserAbortError from an aborted host signal', () => {
    const controller = new AbortController();
    controller.abort();

    const error = normalizeProviderError(
      { name: 'APIUserAbortError' },
      { ...ESTABLISHMENT, signal: controller.signal },
    );

    expect(error.kind).toBe('abort');
  });

  it('classifies the host abort reason as an abort', () => {
    const controller = new AbortController();
    const reason = Object.assign(new Error('cancelled'), {
      code: 'ECONNRESET',
      status: 500,
    });
    controller.abort(reason);

    const error = normalizeProviderError(reason, {
      ...ESTABLISHMENT,
      signal: controller.signal,
    });

    expect(error.kind).toBe('abort');
  });

  it('classifies an abort-shaped failure from an aborted host signal as an abort', () => {
    const controller = new AbortController();
    controller.abort();

    const error = normalizeProviderError(
      { name: 'AbortError', code: 'ECONNRESET' },
      { ...ESTABLISHMENT, signal: controller.signal },
    );

    expect(error.kind).toBe('abort');
  });

  it.each([
    [{ code: 'ECONNRESET' }, 'connection'],
    [{ status: 500 }, 'server'],
  ] satisfies ReadonlyArray<readonly [object, ProviderFailureKind]>)(
    'preserves %s when the host signal was aborted concurrently',
    (sdkError, kind) => {
      const controller = new AbortController();
      controller.abort();

      expect(
        normalizeProviderError(sdkError, {
          ...ESTABLISHMENT,
          signal: controller.signal,
        }).kind,
      ).toBe(kind);
    },
  );

  it('classifies an abort-shaped failure as the fired adapter timeout', () => {
    const controller = new AbortController();
    const timeoutController = new AbortController();
    controller.abort();
    timeoutController.abort();

    const error = normalizeProviderError(
      new DOMException('deadline exceeded', 'AbortError'),
      {
        stage: 'stream_consumption',
        signal: controller.signal,
        timeoutSignal: timeoutController.signal,
        timeoutSource: 'whole_stream',
      },
    );

    expect(error).toMatchObject({
      kind: 'timeout',
      stage: 'stream_consumption',
      timeoutSource: 'whole_stream',
    });
  });

  it('does not apply a timeout signal source before that signal fires', () => {
    const timeoutController = new AbortController();

    const error = normalizeProviderError(
      new DOMException('operation aborted', 'AbortError'),
      {
        ...ESTABLISHMENT,
        timeoutSignal: timeoutController.signal,
        timeoutSource: 'response_start',
      },
    );

    expect(error.kind).toBe('abort');
    expect(error.timeoutSource).toBeUndefined();
  });

  it('preserves a provider failure when the timeout signal fires concurrently', () => {
    const timeoutController = new AbortController();
    timeoutController.abort();

    const error = normalizeProviderError(
      { status: 500 },
      {
        ...ESTABLISHMENT,
        timeoutSignal: timeoutController.signal,
        timeoutSource: 'response_start',
      },
    );

    expect(error).toMatchObject({ kind: 'server', upstreamStatus: 500 });
    expect(error.timeoutSource).toBeUndefined();
  });

  it('preserves safe transport facts from the cause chain', () => {
    const cause = new Error('fetch failed', {
      cause: {
        code: 'ECONNRESET',
        hostname: 'api.provider.example',
      },
    });

    const error = normalizeProviderError(cause, ESTABLISHMENT);

    expect(error).toMatchObject({
      kind: 'connection',
      transportCode: 'ECONNRESET',
      host: 'api.provider.example',
    });
  });

  it('omits unsafe transport facts', () => {
    const error = normalizeProviderError(
      {
        name: 'ConnectionError',
        code: 'unsafe code\nvalue',
        hostname: 'https://user:secret@provider.example',
      },
      ESTABLISHMENT,
    );

    expect(error.kind).toBe('connection');
    expect(error.transportCode).toBeUndefined();
    expect(error.host).toBeUndefined();
  });

  it('preserves provider facts and the original cause without exposing its message', () => {
    const cause = Object.assign(new Error('secret provider payload'), {
      status: 429,
      request_id: 'req_123',
      headers: { 'retry-after': '4' },
    });

    const error = normalizeProviderError(cause, ESTABLISHMENT);

    expect(error).toBeInstanceOf(ModelProviderError);
    expect(error).toMatchObject({
      name: 'ModelProviderError',
      kind: 'rate_limit',
      stage: 'stream_establishment',
      upstreamStatus: 429,
      upstreamRequestId: 'req_123',
      retryAfterMs: 4_000,
      cause,
    });
    expect(error.message).not.toContain(cause.message);
  });

  it('preserves non-Error throw values as the cause of an unknown failure', () => {
    const cause = { providerPayload: true };

    const error = normalizeProviderError(cause, {
      stage: 'stream_consumption',
    });

    expect(error).toMatchObject({
      kind: 'unknown',
      stage: 'stream_consumption',
      cause,
    });
  });

  it('does not wrap an already normalized provider error again', () => {
    const original = normalizeProviderError({ status: 503 }, ESTABLISHMENT);

    expect(
      normalizeProviderError(original, { stage: 'stream_consumption' }),
    ).toBe(original);
  });
});

describe('normalizeProviderStreamErrors', () => {
  it('normalizes iterator.next failures and preserves them over cleanup failures', async () => {
    const primary = Object.assign(new Error('socket closed'), {
      code: 'ECONNRESET',
    });
    const cleanup = new Error('cleanup failed');
    let cleanupCalls = 0;
    const iterable = iterableFromIterator<number>({
      next: async () => Promise.reject(primary),
      return: async () => {
        cleanupCalls += 1;
        throw cleanup;
      },
    });

    const iterator = normalizeProviderStreamErrors(iterable, {
      stage: 'stream_consumption',
    })[Symbol.asyncIterator]();

    await expect(iterator.next()).rejects.toMatchObject({
      kind: 'connection',
      cause: primary,
    });
    expect(cleanupCalls).toBe(1);
  });

  it('leaves caller conversion failures unnormalized and closes the iterator', async () => {
    const conversionError = new Error('local conversion failed');
    let cleanupCalls = 0;
    const iterable = iterableFromIterator<number>({
      next: async () => ({ done: false, value: 1 }),
      return: async () => {
        cleanupCalls += 1;
        return { done: true, value: undefined };
      },
    });

    const consume = async (): Promise<void> => {
      for await (const value of normalizeProviderStreamErrors(
        iterable,
        ESTABLISHMENT,
      )) {
        expect(value).toBe(1);
        throw conversionError;
      }
    };

    await expect(consume()).rejects.toBe(conversionError);
    expect(cleanupCalls).toBe(1);
  });

  it('suppresses cleanup rejection when a consumer abandons the stream', async () => {
    const cleanup = new Error('cleanup failed');
    let cleanupCalls = 0;
    const iterable = iterableFromIterator<number>({
      next: async () => ({ done: false, value: 1 }),
      return: async () => {
        cleanupCalls += 1;
        throw cleanup;
      },
    });

    const consumeOne = async (): Promise<number> => {
      for await (const value of normalizeProviderStreamErrors(
        iterable,
        ESTABLISHMENT,
      )) {
        return value;
      }
      return 0;
    };

    await expect(consumeOne()).resolves.toBe(1);
    expect(cleanupCalls).toBe(1);
  });

  it('does not normalize iterable construction failures', async () => {
    const constructionError = new Error('iterator construction failed');
    const iterable: AsyncIterable<number> = {
      [Symbol.asyncIterator]() {
        throw constructionError;
      },
    };

    const iterator = normalizeProviderStreamErrors(iterable, ESTABLISHMENT)[
      Symbol.asyncIterator
    ]();

    await expect(iterator.next()).rejects.toBe(constructionError);
  });

  it('turns completion after host cancellation into an abort', async () => {
    const controller = new AbortController();
    const reason = new Error('host cancelled');
    let cleanupCalls = 0;
    controller.abort(reason);
    const iterable = iterableFromIterator<number>({
      next: async () => ({ done: true, value: undefined }),
      return: async () => {
        cleanupCalls += 1;
        return { done: true, value: undefined };
      },
    });

    const iterator = normalizeProviderStreamErrors(iterable, {
      stage: 'stream_consumption',
      signal: controller.signal,
    })[Symbol.asyncIterator]();

    await expect(iterator.next()).rejects.toMatchObject({
      kind: 'abort',
      stage: 'stream_consumption',
      cause: reason,
    });
    expect(cleanupCalls).toBe(1);
  });

  it('turns completion after an adapter timeout into a sourced timeout', async () => {
    const timeoutController = new AbortController();
    const reason = new Error('response start deadline');
    timeoutController.abort(reason);
    const iterable = iterableFromIterator<number>({
      next: async () => ({ done: true, value: undefined }),
    });

    const iterator = normalizeProviderStreamErrors(iterable, {
      stage: 'stream_consumption',
      timeoutSignal: timeoutController.signal,
      timeoutSource: 'response_start',
    })[Symbol.asyncIterator]();

    await expect(iterator.next()).rejects.toMatchObject({
      kind: 'timeout',
      stage: 'stream_consumption',
      timeoutSource: 'response_start',
      cause: reason,
    });
  });

  it('does not close an iterator that completed while signals remain live', async () => {
    const controller = new AbortController();
    const timeoutController = new AbortController();
    let cleanupCalls = 0;
    const iterable = iterableFromIterator<number>({
      next: async () => ({ done: true, value: undefined }),
      return: async () => {
        cleanupCalls += 1;
        return { done: true, value: undefined };
      },
    });

    const values: number[] = [];
    for await (const value of normalizeProviderStreamErrors(iterable, {
      ...ESTABLISHMENT,
      signal: controller.signal,
      timeoutSignal: timeoutController.signal,
      timeoutSource: 'whole_stream',
    })) {
      values.push(value);
    }

    expect(values).toEqual([]);
    expect(cleanupCalls).toBe(0);
  });
});

function iterableFromIterator<T>(iterator: AsyncIterator<T>): AsyncIterable<T> {
  return { [Symbol.asyncIterator]: () => iterator };
}
