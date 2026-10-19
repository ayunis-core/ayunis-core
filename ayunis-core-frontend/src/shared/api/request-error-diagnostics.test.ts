import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosRequestConfig } from 'axios';
import schema from './openapi-schema.json';
import endpointTemplates from './request-endpoint-templates.json';
import { requestErrorDiagnostics } from './request-error-diagnostics';

function failure(
  url = '/threads/private-id?token=secret#private',
  overrides: AxiosRequestConfig = {},
  data: unknown = { code: 'VALIDATION_ERROR', message: 'private text' },
) {
  const config = {
    baseURL: '/api',
    url,
    method: 'post',
    data: { prompt: 'private text' },
    ...overrides,
    headers: new AxiosHeaders({ Authorization: 'secret' }),
  };
  return new AxiosError(
    'Request failed with status code 400',
    'ERR_BAD_REQUEST',
    config,
    { private: 'request' },
    { status: 400, statusText: '', data, headers: {}, config },
  );
}

describe('requestErrorDiagnostics', () => {
  it('keeps the template catalog in sync with OpenAPI', () => {
    expect(new Set(endpointTemplates)).toEqual(
      new Set(Object.keys(schema.paths)),
    );
  });
  it('discloses only a catalog template, method, status and allowlisted backend code', () => {
    expect(requestErrorDiagnostics(failure())).toEqual({
      api_endpoint: '/threads/{id}',
      api_method: 'POST',
      api_status: '400',
      api_error_code: 'VALIDATION_ERROR',
    });
  });

  it('prefers static routes over parameter routes', () => {
    expect(requestErrorDiagnostics(failure('/users/name'))?.api_endpoint).toBe(
      '/users/name',
    );
  });

  it('supports absolute URLs within the configured API prefix', () => {
    const url = window.location.origin + '/api/threads/private-id';
    expect(requestErrorDiagnostics(failure(url))?.api_endpoint).toBe(
      '/threads/{id}',
    );
  });

  it.each([
    '/not-an-api-route/private-id?secret=value',
    '//external.example/api/threads/id',
    'https://external.example/api/threads/id',
    'https://[invalid',
  ])('does not disclose unknown or external paths: %s', (url) => {
    expect(requestErrorDiagnostics(failure(url))?.api_endpoint).toBe('unknown');
  });

  it('supports a configured remote API origin and path prefix', () => {
    expect(
      requestErrorDiagnostics(
        failure('threads/id', { baseURL: 'https://api.example/v1/api/' }),
      )?.api_endpoint,
    ).toBe('/threads/{id}');
  });

  it.each([
    'PRIVATE_CUSTOMER_TEXT',
    'VALIDATION_ERROR secret',
    null,
    { secret: 'value' },
  ])('does not copy an unrecognized backend code: %j', (code) => {
    expect(
      requestErrorDiagnostics(failure('/threads/id', {}, { code }))
        ?.api_error_code,
    ).toBe('unknown');
  });

  it.each([undefined, null, 'private text', ['VALIDATION_ERROR']])(
    'handles unexpected response data: %j',
    (data) => {
      const error = failure();
      error.response!.data = data;
      expect(requestErrorDiagnostics(error)?.api_error_code).toBe('unknown');
    },
  );

  it('does not expose an arbitrary method or invalid status', () => {
    const error = failure('/threads/id', { method: 'private-method' });
    error.response!.status = 123456;
    expect(requestErrorDiagnostics(error)).toMatchObject({
      api_method: 'unknown',
      api_status: 'unknown',
    });
  });

  it('handles absent request and response details', () => {
    expect(requestErrorDiagnostics(new AxiosError('Network Error'))).toEqual({
      api_endpoint: 'unknown',
      api_method: 'unknown',
      api_status: 'unknown',
      api_error_code: 'unknown',
    });
  });

  it('leaves non-Axios errors unclassified', () => {
    expect(requestErrorDiagnostics(new Error('boom'))).toBeUndefined();
    expect(requestErrorDiagnostics(null)).toBeUndefined();
  });
});
