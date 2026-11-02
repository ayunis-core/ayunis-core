import { channel } from 'node:diagnostics_channel';
import { EventEmitter } from 'node:events';
import { ConfigService } from '@nestjs/config';
import { trace } from '@opentelemetry/api';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import { Http2TransportDiagnostics } from './http2-transport-diagnostics';

let logger: ReturnType<typeof createLoggerMock>;
const SESSION = () =>
  Object.assign(new EventEmitter(), {
    remoteSettings: { maxConcurrentStreams: 100 },
    closed: false,
    destroyed: false,
  });
const STREAM = (session = SESSION()) =>
  Object.assign(new EventEmitter(), {
    session,
    id: 1,
    rstCode: 0,
    readableDidRead: false,
  });
const publish = (event: string, payload: unknown) =>
  channel(`http2.client.stream.${event}`).publish(payload);
const HEADERS = {
  ':authority': 'api.eu.mistral.ai',
  ':path': '/v1/ocr',
  ':method': 'POST',
};
const fail = (stream: ReturnType<typeof STREAM>, code = 11) => {
  stream.rstCode = code;
  publish('close', { stream });
  publish('error', {
    stream,
    error: Object.assign(new Error('secret upstream error payload'), {
      code: 'ERR_HTTP2_STREAM_ERROR',
    }),
  });
  jest.runAllTicks();
};

describe('Http2TransportDiagnostics', () => {
  let diagnostics: Http2TransportDiagnostics;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['performance'] });
    logger = createLoggerMock();
    diagnostics = new Http2TransportDiagnostics(
      new ConfigService({
        models: {
          azure: {
            endpoint: 'https://tenant.openai.azure.com/private?key=secret',
          },
        },
      }),
    );
    diagnostics.onModuleInit();
  });

  afterEach(() => {
    jest.runAllTicks();
    diagnostics.onModuleDestroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('records one safe failure with provider, lifecycle, reset and runtime facts', () => {
    const stream = STREAM();
    publish('created', { stream, headers: HEADERS });
    fail(stream);
    publish('close', { stream });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'mistral',
        upstreamHost: 'api.eu.mistral.ai',
        operation: 'ocr',
        phase: 'before_response_headers',
        resetCode: 11,
        resetName: 'NGHTTP2_ENHANCE_YOUR_CALM',
        responseBodyRead: false,
        nodeVersion: process.versions.node,
        bundledUndiciVersion: process.versions.undici,
        sessionId: expect.any(String),
        sessionStreamCount: 1,
      }),
      'Provider HTTP2 stream failed',
    );
  });

  it('captures the originating trace rather than a later callback context', () => {
    const spanContext = {
      traceId: 'a'.repeat(32),
      spanId: 'b'.repeat(16),
      traceFlags: 1,
    };
    const spy = jest
      .spyOn(trace, 'getActiveSpan')
      .mockReturnValue(trace.wrapSpanContext(spanContext));
    const stream = STREAM();
    publish('created', { stream, headers: HEADERS });
    spy.mockReturnValue(undefined);
    fail(stream);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
      }),
      expect.any(String),
    );
  });

  it('distinguishes body failures without reading or listening to the body', () => {
    const stream = STREAM();
    publish('created', { stream, headers: HEADERS });
    publish('finish', { stream, headers: { ':status': 200 } });
    stream.readableDidRead = true;
    fail(stream, 2);

    expect(stream.listenerCount('data')).toBe(0);
    expect(stream.listenerCount('error')).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: 'response_body',
        responseBodyRead: true,
        resetName: 'NGHTTP2_INTERNAL_ERROR',
        upstreamStatus: 200,
      }),
      expect.any(String),
    );
  });

  it('captures numeric GOAWAY facts across concurrent streams without debug payloads', () => {
    const session = SESSION();
    const first = STREAM(session);
    const second = STREAM(session);
    publish('created', { stream: first, headers: HEADERS });
    publish('created', { stream: second, headers: HEADERS });
    session.emit('goaway', 11, 3, Buffer.from('private debug payload'));
    fail(first);
    fail(second);

    const firstRecord = logger.warn.mock.calls[0][0] as Record<string, unknown>;
    const secondRecord = logger.warn.mock.calls[1][0] as Record<
      string,
      unknown
    >;
    expect(firstRecord).toMatchObject({
      goawayCode: 11,
      goawayLastStreamId: 3,
    });
    expect(secondRecord.sessionId).toBe(firstRecord.sessionId);
    expect(secondRecord.sessionStreamCount).toBe(2);
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(
      'private debug payload',
    );
  });

  it('retains only explicitly allowlisted GOAWAY reason tokens', () => {
    const session = SESSION();
    const stream = STREAM(session);
    publish('created', { stream, headers: HEADERS });
    session.emit('goaway', 11, 1, Buffer.from('too_many_pings'));
    fail(stream);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        goawayReason: 'too_many_pings',
        goawayDebugBytes: 14,
      }),
      expect.any(String),
    );
  });

  it('does not misattribute a host shared by configured providers', () => {
    diagnostics.onModuleDestroy();
    diagnostics = new Http2TransportDiagnostics(
      new ConfigService({
        models: {
          ollama: { baseURL: 'https://shared.invalid' },
          ayunis: { baseURL: 'https://shared.invalid/v1' },
        },
      }),
    );
    diagnostics.onModuleInit();
    const stream = STREAM();
    publish('created', {
      stream,
      headers: { ...HEADERS, ':authority': 'shared.invalid' },
    });
    fail(stream);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'shared',
        upstreamHost: 'shared.invalid',
      }),
      expect.any(String),
    );
  });

  it('includes a separately configured Mistral embedding endpoint', () => {
    diagnostics.onModuleDestroy();
    diagnostics = new Http2TransportDiagnostics(
      new ConfigService({
        embeddings: {
          mistral: { serverUrl: 'https://embedding.internal.invalid/v1' },
        },
      }),
    );
    diagnostics.onModuleInit();
    const stream = STREAM();
    publish('created', {
      stream,
      headers: {
        ...HEADERS,
        ':authority': 'embedding.internal.invalid',
        ':path': '/v1/embeddings',
      },
    });
    fail(stream);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'mistral',
        operation: 'embedding',
        upstreamHost: 'embedding.internal.invalid',
      }),
      expect.any(String),
    );
  });

  it('never serializes paths, query strings, credentials, headers, or raw errors', () => {
    const stream = STREAM();
    publish('created', {
      stream,
      headers: {
        ...HEADERS,
        ':path': '/v1/ocr?token=secret-query',
        authorization: 'Bearer secret-credential',
        'x-user-content': 'private prompt',
      },
    });
    fail(stream);

    const output = JSON.stringify(logger.warn.mock.calls);
    for (const secret of [
      'secret-query',
      'secret-credential',
      'private prompt',
      'secret upstream error payload',
      '/v1/ocr',
    ]) {
      expect(output).not.toContain(secret);
    }
  });

  it('supports a configured provider endpoint without exposing its path or query', () => {
    const stream = STREAM();
    publish('created', {
      stream,
      headers: {
        ...HEADERS,
        ':authority': 'tenant.openai.azure.com',
        ':path':
          '/openai/deployments/private-model/chat/completions?api-version=secret',
      },
    });
    fail(stream);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'azure',
        upstreamHost: 'tenant.openai.azure.com',
        operation: 'inference',
      }),
      expect.any(String),
    );
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(
      'private-model',
    );
  });

  it('ignores unrelated origins, successful streams, and ordinary cancellation', () => {
    for (const [authority, code] of [
      ['customer.invalid', 11],
      ['api.eu.mistral.ai', 0],
      ['api.eu.mistral.ai', 8],
    ] as const) {
      const stream = STREAM();
      publish('created', {
        stream,
        headers: { ...HEADERS, ':authority': authority },
      });
      stream.rstCode = code;
      publish('close', { stream });
    }
    jest.runAllTicks();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('validates stream fields and snapshots error-code accessors before logging', () => {
    const stream = STREAM();
    Object.assign(stream, {
      id: { private: 'private-id' },
      readableDidRead: 'private-body',
    });
    let reads = 0;
    const error = {
      get code() {
        return ++reads <= 2 ? 'ERR_HTTP2_STREAM_ERROR' : 'private-error';
      },
    };
    publish('created', { stream, headers: HEADERS });
    stream.rstCode = 11;
    publish('close', { stream });
    publish('error', { stream, error });
    jest.runAllTicks();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        streamId: undefined,
        responseBodyRead: false,
        transportErrorCode: 'ERR_HTTP2_STREAM_ERROR',
      }),
      expect.any(String),
    );
    expect(JSON.stringify(logger.warn.mock.calls)).not.toMatch(
      /private-(?:id|body|error)/,
    );
    expect(reads).toBe(1);
  });

  it('does not let malformed diagnostics or logging failures escape to the caller', () => {
    expect(() => publish('created', null)).not.toThrow();
    const stream = STREAM();
    publish('created', { stream, headers: HEADERS });
    logger.warn.mockImplementationOnce(() => {
      throw new Error('logger unavailable');
    });
    expect(() => fail(stream)).not.toThrow();
  });

  it('cleans session listeners and permits a clean re-registration', () => {
    const session = SESSION();
    publish('created', { stream: STREAM(session), headers: HEADERS });
    diagnostics.onModuleInit();
    expect(session.listenerCount('goaway')).toBe(1);
    diagnostics.onModuleDestroy();
    expect(session.listenerCount('goaway')).toBe(0);
    expect(session.listenerCount('close')).toBe(0);
    expect(session.listenerCount('remoteSettings')).toBe(0);
    diagnostics.onModuleInit();
    const stream = STREAM();
    publish('created', { stream, headers: HEADERS });
    fail(stream);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
