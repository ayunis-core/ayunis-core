import { createServer, type Server, type Socket } from 'node:net';
import type { AddressInfo } from 'node:net';
import {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ProviderFailureClass } from 'src/common/errors/provider.errors';
import { classifyTransportError } from 'src/common/errors/provider-transport-error.classifier';
import { extractUpstreamStatus } from 'src/common/errors/extract-upstream-status.helper';
import anonymizeAxiosInstance, {
  parseAnonymizeTimingMetadata,
  toSlimTransportError,
} from './client';

const RAW_USER_TEXT = 'Max Mustermann, geboren am 01.02.1980, wohnhaft in Bonn';

function axiosConfig(): InternalAxiosRequestConfig {
  return {
    url: '/analyze',
    method: 'post',
    data: JSON.stringify({ text: RAW_USER_TEXT }),
    headers: {},
  } as unknown as InternalAxiosRequestConfig;
}

function axiosTimeout(): AxiosError {
  return new AxiosError(
    'timeout of 60000ms exceeded',
    'ETIMEDOUT',
    axiosConfig(),
  );
}

function axiosServerFailure(): AxiosError {
  const response = {
    status: 503,
    data: { detail: 'model worker crashed' },
  } as AxiosResponse;
  return new AxiosError(
    'Request failed with status code 503',
    'ERR_BAD_RESPONSE',
    axiosConfig(),
    {},
    response,
  );
}

describe('parseAnonymizeTimingMetadata', () => {
  it('turns service timing headers into numeric log attributes', () => {
    const metadata = parseAnonymizeTimingMetadata(
      {
        'server-timing':
          'queue;dur=12.25, model_load;dur=0.50, processing;dur=345.75',
        'x-anonymize-cold-start': 'false',
      },
      360.25,
    );

    expect(metadata).toEqual({
      requestDurationMs: 360.25,
      queueDurationMs: 12.25,
      modelLoadDurationMs: 0.5,
      processingDurationMs: 345.75,
      coldStart: false,
    });
  });

  it('keeps total duration observable when service headers are absent', () => {
    expect(parseAnonymizeTimingMetadata({}, 60000)).toEqual({
      requestDurationMs: 60000,
    });
  });
});

describe('toSlimTransportError', () => {
  it('strips the request payload so raw user text can never reach logs', () => {
    const slim = toSlimTransportError(axiosTimeout());

    expect('config' in slim).toBe(false);
    expect('request' in slim).toBe(false);
    expect('response' in slim).toBe(false);
    expect(JSON.stringify({ ...slim, message: slim.message })).not.toContain(
      'Mustermann',
    );
  });

  it('keeps the fields the transport classifier reads', () => {
    const slim = toSlimTransportError(axiosTimeout());

    expect(slim.message).toBe('timeout of 60000ms exceeded');
    expect(classifyTransportError(slim)?.failureClass).toBe(
      ProviderFailureClass.TIMEOUT,
    );
  });

  it('keeps the upstream status the taxonomy needs for 5xx vs 4xx routing', () => {
    const slim = toSlimTransportError(axiosServerFailure());

    expect(extractUpstreamStatus(slim)).toBe(503);
    expect('response' in slim).toBe(false);
  });

  it('preserves the low-level cause chain that carries errno codes', () => {
    const dnsFailure = Object.assign(new Error('getaddrinfo EAI_AGAIN'), {
      code: 'EAI_AGAIN',
    });
    const wrapped = new AxiosError('Network Error', undefined, axiosConfig());
    wrapped.cause = dnsFailure;

    const slim = toSlimTransportError(wrapped);

    expect(classifyTransportError(slim)?.failureClass).toBe(
      ProviderFailureClass.CONNECTION,
    );
  });

  it('passes non-axios errors through unchanged', () => {
    const plain = new Error('something else');
    expect(toSlimTransportError(plain)).toBe(plain);
  });

  it('wraps non-Error rejections', () => {
    const slim = toSlimTransportError('boom');
    expect(slim).toBeInstanceOf(Error);
    expect(slim.message).toBe('boom');
  });
});

const UVICORN_KEEP_ALIVE_MS = 5_000;
const HTTP_RESPONSE =
  'HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: 14\r\n\r\n{"results":[]}';

// Like uvicorn: answers without a Keep-Alive hint and drops a connection once
// it has been idle for the keep-alive timeout.
function startUvicornLikeServer(): Promise<{
  server: Server;
  sockets: Socket[];
}> {
  const sockets: Socket[] = [];
  const server = createServer((socket) => {
    sockets.push(socket);
    let idle: NodeJS.Timeout | undefined;
    socket.on('data', (chunk) => {
      clearTimeout(idle);
      if (!chunk.toString().includes('{"text":"x"}')) return;
      socket.write(HTTP_RESPONSE);
      idle = setTimeout(() => socket.destroy(), UVICORN_KEEP_ALIVE_MS);
    });
    socket.on('close', () => clearTimeout(idle));
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve({ server, sockets })),
  );
}

describe('anonymize HTTP connection reuse', () => {
  it('stops reusing an idle connection before the service closes it', async () => {
    const { server, sockets } = await startUvicornLikeServer();
    const { port } = server.address() as AddressInfo;
    const analyze = () =>
      anonymizeAxiosInstance({
        url: `http://127.0.0.1:${port}/analyze`,
        method: 'POST',
        data: { text: 'x' },
      });

    try {
      await analyze();
      await new Promise((resolve) => setTimeout(resolve, 4_500));
      await analyze();

      expect(sockets).toHaveLength(2);
    } finally {
      sockets.forEach((socket) => socket.destroy());
      await new Promise((resolve) => server.close(resolve));
    }
  }, 10_000);
});
