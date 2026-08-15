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
