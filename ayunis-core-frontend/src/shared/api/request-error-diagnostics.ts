import axios, { isAxiosError, type AxiosRequestConfig } from 'axios';
import endpointTemplates from './request-endpoint-templates.json';

const methods = new Set([
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
]);
// Only reviewed backend constants belong here; response messages and arbitrary codes are untrusted.
const errorCodes = new Set([
  'VALIDATION_ERROR',
  'INVALID_CREDENTIALS',
  'INVALID_TOKEN',
  'INVALID_PASSWORD',
  'TOKEN_EXPIRED',
  'THREAD_NOT_FOUND',
  'SOURCE_ALREADY_ASSIGNED',
  'SOURCE_LIMIT_EXCEEDED',
  'NO_MODEL_PROVIDED',
  'UNSUPPORTED_IMAGE_CONTENT_TYPE',
]);
const templates = endpointTemplates
  .map((template) => ({ template, segments: template.split('/') }))
  .sort((a, b) => parameterCount(a.template) - parameterCount(b.template));

function parameterCount(template: string): number {
  return template.split('{').length - 1;
}

function endpointTemplate(config: AxiosRequestConfig | undefined): string {
  if (!config?.url) return 'unknown';
  try {
    const base = new URL(config.baseURL || '/', window.location.origin);
    const uri = axios.getUri({ baseURL: config.baseURL, url: config.url });
    const url = new URL(uri, window.location.origin);
    const prefix = base.pathname.replace(/\/$/, '');
    if (url.origin !== base.origin || !url.pathname.startsWith(prefix + '/')) {
      return 'unknown';
    }
    const segments = url.pathname.slice(prefix.length).split('/');
    return (
      templates.find((entry) => matchesTemplate(entry.segments, segments))
        ?.template ?? 'unknown'
    );
  } catch {
    return 'unknown';
  }
}

function matchesTemplate(template: string[], path: string[]): boolean {
  return (
    template.length === path.length &&
    template.every((segment, index) =>
      segment.startsWith('{')
        ? path[index].length > 0
        : segment === path[index],
    )
  );
}

function backendCode(data: unknown): string {
  if (!data || typeof data !== 'object' || !('code' in data)) return 'unknown';
  return typeof data.code === 'string' && errorCodes.has(data.code)
    ? data.code
    : 'unknown';
}

export function requestErrorDiagnostics(
  error: unknown,
): Record<string, string> | undefined {
  if (!isAxiosError(error)) return undefined;
  const method = error.config?.method?.toUpperCase() ?? '';
  const status = error.response?.status;
  return {
    api_endpoint: endpointTemplate(error.config),
    api_method: methods.has(method) ? method : 'unknown',
    api_status:
      typeof status === 'number' &&
      Number.isInteger(status) &&
      status >= 100 &&
      status <= 599
        ? String(status)
        : 'unknown',
    api_error_code: backendCode(error.response?.data),
  };
}
