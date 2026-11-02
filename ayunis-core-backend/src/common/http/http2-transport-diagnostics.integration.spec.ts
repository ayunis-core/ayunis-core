import { once } from 'node:events';
import {
  connect,
  createServer,
  type ClientHttp2Session,
  type ClientHttp2Stream,
  type Http2Server,
  type ServerHttp2Session,
  type ServerHttp2Stream,
} from 'node:http2';
import type { AddressInfo } from 'node:net';
import { ConfigService } from '@nestjs/config';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import { Http2TransportDiagnostics } from './http2-transport-diagnostics';

interface Outcome {
  body: string;
  error?: Error & { code?: string };
}
function outcome(stream: ClientHttp2Stream): Promise<Outcome> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let error: Outcome['error'];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', (value: Outcome['error']) => {
      error = value;
    });
    stream.once('close', () =>
      resolve({ body: Buffer.concat(chunks).toString(), error }),
    );
  });
}

describe('HTTP2 diagnostics against real streams', () => {
  let server: Http2Server;
  let client: ClientHttp2Session;
  let diagnostics: Http2TransportDiagnostics;
  let logger: ReturnType<typeof createLoggerMock>;
  const sessions = new Set<ServerHttp2Session>();

  beforeEach(async () => {
    logger = createLoggerMock();
    diagnostics = new Http2TransportDiagnostics(
      new ConfigService({
        models: { azure: { endpoint: 'http://127.0.0.1' } },
      }),
    );
    diagnostics.onModuleInit();
    server = createServer();
    server.on('session', (session) => {
      sessions.add(session);
      session.on('error', () => undefined);
      session.once('close', () => sessions.delete(session));
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    client = connect(
      `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    );
    client.on('error', () => undefined);
    await once(client, 'connect');
  });

  afterEach(async () => {
    diagnostics.onModuleDestroy();
    client.destroy();
    for (const session of sessions) session.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    jest.restoreAllMocks();
  });

  it('preserves success and reports a subsequent peer reset on the reused session', async () => {
    let requests = 0;
    server.on('stream', (stream) => {
      stream.on('error', () => undefined);
      if (++requests === 1) {
        stream.respond({ ':status': 200 });
        stream.end('OK');
      } else stream.close(11);
    });
    expect(await outcome(client.request({ ':path': '/v1/ocr' }))).toEqual({
      body: 'OK',
      error: undefined,
    });
    expect(logger.warn).not.toHaveBeenCalled();
    const failed = await outcome(client.request({ ':path': '/v1/ocr' }));

    expect(failed.error?.code).toBe('ERR_HTTP2_STREAM_ERROR');
    expect(requests).toBe(2);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        resetCode: 11,
        resetName: 'NGHTTP2_ENHANCE_YOUR_CALM',
        transportErrorCode: 'ERR_HTTP2_STREAM_ERROR',
        phase: 'before_response_headers',
        sessionStreamCount: 2,
        upstreamHost: '127.0.0.1',
        provider: 'azure',
        operation: 'ocr',
      }),
      expect.any(String),
    );
  });

  it('keeps partial output and the original body failure without replaying the request', async () => {
    let upstream: ServerHttp2Stream;
    let requests = 0;
    server.on('stream', (stream) => {
      upstream = stream;
      requests++;
      stream.on('error', () => undefined);
      stream.respond({ ':status': 200 });
      stream.write('visible prefix');
    });
    const stream = client.request({ ':path': '/v1/chat/completions' });
    const result = outcome(stream);
    stream.once('data', () =>
      upstream.destroy(new Error('synthetic upstream reset')),
    );
    const failed = await result;

    expect(failed.body).toBe('visible prefix');
    expect(failed.error?.code).toBe('ERR_HTTP2_STREAM_ERROR');
    expect(requests).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        resetCode: 2,
        phase: 'response_body',
        responseBodyRead: true,
      }),
      expect.any(String),
    );
  });

  it('correlates a peer GOAWAY with both concurrent stream failures', async () => {
    server.once('stream', (stream) => {
      stream.on('error', () => undefined);
      stream.session?.goaway(11, 0, Buffer.from('private upstream debug data'));
    });
    server.on('stream', (stream) => stream.on('error', () => undefined));
    const first = outcome(client.request({ ':path': '/v1/embeddings' }));
    const second = outcome(client.request({ ':path': '/v1/embeddings' }));
    const results = await Promise.all([first, second]);

    expect(results.every((result) => result.error)).toBe(true);
    expect(logger.warn).toHaveBeenCalledTimes(2);
    const records = logger.warn.mock.calls.map(
      ([record]) => record as Record<string, unknown>,
    );
    expect(records[0].sessionId).toBe(records[1].sessionId);
    expect(records[0]).toMatchObject({ goawayCode: 11, goawayLastStreamId: 1 });
    expect(JSON.stringify(records)).not.toContain(
      'private upstream debug data',
    );
  });
});
