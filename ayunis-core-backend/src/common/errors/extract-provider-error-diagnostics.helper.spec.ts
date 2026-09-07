import { extractProviderErrorDiagnostics } from './extract-provider-error-diagnostics.helper';

describe('extractProviderErrorDiagnostics', () => {
  it('extracts a provider request ID from Web API response headers', () => {
    const error = Object.assign(new Error('unsupported parameter: parallel'), {
      status: 400,
      response: {
        headers: new Headers({
          'x-request-id': 'req_azure_response_123',
        }),
      },
    });

    expect(extractProviderErrorDiagnostics(error)).toMatchObject({
      upstreamStatus: 400,
      upstreamRequestId: 'req_azure_response_123',
      upstreamReason: 'unsupported_parameter',
    });
  });

  it('extracts a provider request ID from direct Web API headers', () => {
    const error = Object.assign(new Error('invalid tool schema'), {
      status: 400,
      headers: new Headers({
        'request-id': 'req_mistral_direct_456',
      }),
    });

    expect(extractProviderErrorDiagnostics(error)).toMatchObject({
      upstreamStatus: 400,
      upstreamRequestId: 'req_mistral_direct_456',
      upstreamReason: 'invalid_tool_schema',
    });
  });

  it('extracts a retry-after delay in milliseconds, preferring retry-after-ms', () => {
    const seconds = Object.assign(new Error('rate limit exceeded'), {
      status: 429,
      headers: new Headers({ 'retry-after': '3' }),
    });
    const millis = Object.assign(new Error('rate limit exceeded'), {
      status: 429,
      headers: { 'retry-after': '3', 'retry-after-ms': '250' },
    });
    const httpDate = Object.assign(new Error('rate limit exceeded'), {
      status: 429,
      headers: { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' },
    });

    expect(extractProviderErrorDiagnostics(seconds).upstreamRetryAfterMs).toBe(
      3_000,
    );
    expect(extractProviderErrorDiagnostics(millis).upstreamRetryAfterMs).toBe(
      250,
    );
    expect(
      extractProviderErrorDiagnostics(httpDate).upstreamRetryAfterMs,
    ).toBeUndefined();
  });

  it('extracts a provider request ID from plain-object headers', () => {
    const error = Object.assign(new Error('content filter rejection'), {
      status: 400,
      headers: {
        'apim-request-id': 'req_plain_object_789',
      },
    });

    expect(extractProviderErrorDiagnostics(error)).toMatchObject({
      upstreamStatus: 400,
      upstreamRequestId: 'req_plain_object_789',
      upstreamReason: 'content_filter',
    });
  });
});
