import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

interface ApiAuthorization {
  getHeader(): string | Promise<string>;
  refresh?(this: void, rejectedHeader: string): Promise<void>;
  onFetchUnauthorized?(): void;
}

interface ApiTransportOptions {
  baseUrl: string;
  credentials: 'include' | 'omit';
  authorization?: ApiAuthorization;
}

export interface ApiTransport {
  readonly baseUrl: string;
  readonly credentials: ApiTransportOptions['credentials'];
  readonly axios: AxiosInstance;
  fetch(this: void, path: string, init?: RequestInit): Promise<Response>;
}

type AuthorizationRetryConfig = InternalAxiosRequestConfig & {
  authorizationRetried?: boolean;
};

function refreshAxiosAuthorization(
  client: AxiosInstance,
  refresh: NonNullable<ApiAuthorization['refresh']>,
) {
  client.interceptors.response.use(undefined, async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      throw error;
    }
    const config: AuthorizationRetryConfig | undefined = error.config;
    const rejected = config?.headers.get('Authorization');
    if (
      !config ||
      config.authorizationRetried ||
      typeof rejected !== 'string'
    ) {
      throw error;
    }
    await refresh(rejected);
    const retry: AuthorizationRetryConfig = {
      ...config,
      authorizationRetried: true,
    };
    return client(retry);
  });
}

function createFetch({
  baseUrl,
  credentials,
  authorization,
}: ApiTransportOptions): ApiTransport['fetch'] {
  if (!authorization) {
    return (path, init) => fetch(`${baseUrl}${path}`, { ...init, credentials });
  }

  const send = (path: string, init: RequestInit, header?: string) => {
    const headers = new Headers(init.headers);
    if (header !== undefined) headers.set('Authorization', header);
    return fetch(`${baseUrl}${path}`, { ...init, credentials, headers });
  };

  return async (path, init = {}) => {
    const header = await authorization.getHeader();
    let response = await send(path, init, header);
    if (response.status === 401 && authorization.refresh) {
      await authorization.refresh(header);
      response = await send(path, init, await authorization.getHeader());
    }
    if (response.status === 401) authorization.onFetchUnauthorized?.();
    return response;
  };
}

export function createApiTransport(options: ApiTransportOptions): ApiTransport {
  const { baseUrl, credentials, authorization } = options;
  const client = axios.create({
    baseURL: baseUrl,
    withCredentials: credentials === 'include',
    // Nest expects array params as repeated keys, without brackets.
    paramsSerializer: { indexes: null },
  });

  if (credentials === 'omit' || authorization) {
    client.interceptors.request.use(async (config) => {
      if (credentials === 'omit') {
        // XHR sends same-origin cookies regardless of withCredentials.
        config.adapter = 'fetch';
        config.withCredentials = false;
      }
      if (authorization)
        config.headers.set('Authorization', await authorization.getHeader());
      return config;
    });
  }
  if (authorization?.refresh)
    refreshAxiosAuthorization(client, authorization.refresh);

  return { baseUrl, credentials, axios: client, fetch: createFetch(options) };
}

let configuredTransport: ApiTransport | undefined;

export function configureApiTransport(transport: ApiTransport): void {
  configuredTransport = transport;
}

export function getApiTransport(): ApiTransport {
  if (!configuredTransport)
    throw new Error('Configure the API transport before making requests');
  return configuredTransport;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return getApiTransport().fetch(path, init);
}
