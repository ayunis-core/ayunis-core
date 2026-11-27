import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getApiTransport } from '@ayunis/api-client/transport';

/** What the chat composer loads for itself, answered with neutral defaults. */
const CHAT_DEFAULTS: Record<string, unknown> = {
  'GET /models/permitted/language-models': [],
  'GET /models/modes': [],
  'GET /feature-toggles': {},
  'GET /academy-access/status': { allowed: true },
  'GET /models/embedding/enabled': { isEmbeddingModelEnabled: false },
  'GET /models/default-selection': null,
  'GET /chat-settings/chat-start-defaults': { anonymousModeByDefault: false },
};

export interface ServedRequest {
  readonly method: string;
  readonly url: string;
  readonly data: unknown;
}

/**
 * Answers requests on the configured API transport by `METHOD /path` with a
 * response body, or a function of the request returning one; a route that
 * isn't served fails with 404. Returns the requests made.
 */
export function serveChatApi(routes: Record<string, unknown> = {}) {
  const served = { ...CHAT_DEFAULTS, ...routes };
  const requests: ServedRequest[] = [];
  getApiTransport().axios.defaults.adapter = async (config) => {
    const method = (config.method ?? 'get').toUpperCase();
    const url = config.url ?? '';
    requests.push({ method, url, data: config.data });
    const key = `${method} ${url}`;
    if (!(key in served)) {
      throw new AxiosError('Not served', 'ERR_BAD_REQUEST', config, null, {
        data: { code: 'NOT_FOUND' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config,
      });
    }
    const route = served[key];
    const data: unknown =
      typeof route === 'function'
        ? await (route as (request: InternalAxiosRequestConfig) => unknown)(
            config,
          )
        : route;
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  return requests;
}

/** Renders with a fresh query client, as the chat package reads shared data through it. */
export function renderWithQueryClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Providers({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  }
  return { client, ...render(ui, { wrapper: Providers }) };
}
