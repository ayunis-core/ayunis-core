import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Appsignal from '@appsignal/javascript';
import { AxiosError, AxiosHeaders } from 'axios';
import {
  installWindowErrorReporting,
  sendErrorReport,
} from './appsignal-request-reporting';

const originalErrorHandler = window.onerror;
const originalRejectionHandler = window.onunhandledrejection;
const fetchMock = vi.fn<typeof fetch>();

function apiError(id = 'private-id'): AxiosError<unknown> {
  const config = {
    baseURL: '/api',
    url: '/threads/' + id + '?token=secret',
    method: 'patch',
    headers: new AxiosHeaders({ Authorization: 'secret' }),
    data: { content: 'private-content' },
  };
  return new AxiosError(
    'Request failed with status code 400',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      status: 400,
      statusText: '',
      headers: {},
      config,
      data: {
        code: 'VALIDATION_ERROR',
        message: 'private-message',
        metadata: { secret: 'private-metadata' },
      },
    },
  );
}

function reject(reason: unknown) {
  const event = new Event('unhandledrejection');
  Object.defineProperty(event, 'reason', { value: reason });
  window.onunhandledrejection?.call(window, event as PromiseRejectionEvent);
}

function payloads() {
  return fetchMock.mock.calls.map(
    ([, options]) =>
      JSON.parse(options?.body as string) as {
        tags?: Record<string, string>;
        error: { name: string; message: string };
      },
  );
}

beforeEach(() => {
  vi.stubGlobal('jest', {}); // Select the SDK browser transport under Vitest's Node host.
  vi.stubGlobal(
    'fetch',
    fetchMock.mockResolvedValue(new Response(null, { status: 200 })),
  );
  window.onerror = null;
  window.onunhandledrejection = null;
});

afterEach(() => {
  window.onerror = originalErrorHandler;
  window.onunhandledrejection = originalRejectionHandler;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

describe('AppSignal request reporting', () => {
  it('sends one enriched unhandled Axios error without request or response data', async () => {
    const client = new Appsignal({ key: 'test-key' });
    installWindowErrorReporting(client);
    reject(apiError());
    await vi.waitFor(() => expect(payloads()).toHaveLength(1));
    expect(payloads()[0].tags).toEqual({
      api_endpoint: '/threads/{id}',
      api_method: 'PATCH',
      api_status: '400',
      api_error_code: 'VALIDATION_ERROR',
    });
    const serialized = JSON.stringify(payloads());
    for (const secret of [
      'private-id',
      'token=',
      'Authorization',
      'private-content',
      'private-message',
      'private-metadata',
    ])
      expect(serialized).not.toContain(secret);
  });

  it('keeps diagnostics per error when different requests fail together', async () => {
    const client = new Appsignal({ key: 'test-key' });
    installWindowErrorReporting(client);
    const second = apiError('another-private-id');
    second.config!.url = '/users/name';
    second.config!.method = 'put';
    second.response!.data = { code: 'private-code' };
    reject(apiError());
    reject(second);
    await vi.waitFor(() => expect(payloads()).toHaveLength(2));
    expect(payloads().map((p) => p.tags)).toEqual([
      {
        api_endpoint: '/threads/{id}',
        api_method: 'PATCH',
        api_status: '400',
        api_error_code: 'VALIDATION_ERROR',
      },
      {
        api_endpoint: '/users/name',
        api_method: 'PUT',
        api_status: '400',
        api_error_code: 'unknown',
      },
    ]);
  });

  it('enriches explicit reports and retains supplied params', async () => {
    const client = new Appsignal({ key: 'test-key' });
    await sendErrorReport(client, apiError(), { route: '/chat/$threadId' });
    expect(payloads()[0].tags?.api_endpoint).toBe('/threads/{id}');
    expect(JSON.stringify(payloads())).toContain('/chat/$threadId');
  });

  it('preserves context decorators and ignore/override filtering', async () => {
    const client = new Appsignal({
      key: 'test-key',
      ignoreErrors: [/^canceled$/],
    });
    client.addDecorator((span) => span.setTags({ org_id: 'test-org' }));
    client.addOverride((span) =>
      span.getError()?.message === 'ignored' ? false : span,
    );
    installWindowErrorReporting(client);
    const canceled = apiError();
    canceled.message = 'canceled';
    reject(canceled);
    const ignored = apiError();
    ignored.message = 'ignored';
    reject(ignored);
    reject(apiError());
    await vi.waitFor(() => expect(payloads()).toHaveLength(1));
    expect(payloads()[0].tags).toMatchObject({
      org_id: 'test-org',
      api_status: '400',
    });
  });

  it('preserves the plugin behavior for ordinary, string and circular rejections', async () => {
    const client = new Appsignal({ key: 'test-key' });
    installWindowErrorReporting(client);
    reject(new TypeError('ordinary failure'));
    reject('string rejection');
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    reject(cyclic);
    await vi.waitFor(() => expect(payloads()).toHaveLength(3));
    expect(payloads().map((p) => p.error.name)).toEqual([
      'TypeError',
      'UnhandledPromiseRejectionError',
      'UnhandledPromiseRejectionError',
    ]);
    expect(payloads().every((p) => !p.tags)).toBe(true);
  });

  it('calls the previous rejection handler once for each event', () => {
    const previous = vi.fn();
    window.onunhandledrejection = previous;
    const client = new Appsignal({ key: 'test-key' });
    installWindowErrorReporting(client);
    reject(apiError());
    reject(new Error('ordinary'));
    expect(previous).toHaveBeenCalledTimes(2);
  });

  it('enriches Axios window errors and preserves the previous handler result', async () => {
    const previous = vi.fn(() => true);
    window.onerror = previous;
    const client = new Appsignal({ key: 'test-key' });
    installWindowErrorReporting(client);
    const result = window.onerror?.call(window, 'failed', '', 0, 0, apiError());
    await vi.waitFor(() => expect(payloads()).toHaveLength(1));
    expect(payloads()[0].tags?.api_endpoint).toBe('/threads/{id}');
    expect(previous).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it('keeps window error capture enabled', async () => {
    const client = new Appsignal({ key: 'test-key' });
    installWindowErrorReporting(client);
    window.onerror?.call(
      window,
      'window failure',
      '',
      0,
      0,
      new TypeError('window failure'),
    );
    await vi.waitFor(() => expect(payloads()).toHaveLength(1));
    expect(payloads()[0].error.message).toBe('window failure');
  });
});
