import type { APIRequestContext } from '@playwright/test';
import type { AxiosRequestConfig } from 'axios';

export interface PlaywrightApiClientOptions {
  api: APIRequestContext;
}

type RequestData = string | number | boolean | object | null;
type RequestParams = Record<string, string | number | boolean>;

type PlaywrightFetchOptions = Parameters<APIRequestContext['fetch']>[1];

function apiPath(url: string | undefined): string {
  if (!url) throw new Error('Generated API request is missing a URL');
  return url.startsWith('/api/') ? url : `/api${url}`;
}

function requestData(data: unknown): RequestData | undefined {
  if (data === undefined) return undefined;
  if (
    data === null ||
    typeof data === 'string' ||
    typeof data === 'number' ||
    typeof data === 'boolean' ||
    typeof data === 'object'
  ) {
    return data;
  }
  throw new Error(`Unsupported generated API request body: ${typeof data}`);
}

function requestParams(params: unknown): RequestParams | undefined {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return undefined;
  }
  return params as RequestParams;
}

async function responseBody<T>(
  res: Awaited<ReturnType<APIRequestContext['fetch']>>,
): Promise<T> {
  const text = await res.text();
  if (!text) return undefined as T;
  const contentType = res.headers()['content-type'] ?? '';
  if (contentType.includes('application/json')) return JSON.parse(text) as T;
  return text as T;
}

export async function playwrightApiClient<T>(
  request: AxiosRequestConfig,
  options?: PlaywrightApiClientOptions,
): Promise<T> {
  if (!options) {
    throw new Error('Generated API call is missing a Playwright api context');
  }
  const fetchOptions: PlaywrightFetchOptions = {
    method: request.method,
    headers: request.headers as Record<string, string> | undefined,
    data: requestData(request.data),
    params: requestParams(request.params),
  };
  const res = await options.api.fetch(apiPath(request.url), fetchOptions);
  if (!res.ok()) {
    throw new Error(
      `${request.method ?? 'GET'} ${request.url ?? ''} failed (HTTP ${res.status()}): ${await res.text()}`,
    );
  }
  return responseBody<T>(res);
}
