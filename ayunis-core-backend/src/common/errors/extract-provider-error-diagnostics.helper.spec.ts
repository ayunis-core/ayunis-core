import { ModelProviderError } from '@ayunis/inference';
import {
  extractProviderErrorDiagnostics,
  extractProviderExplanation,
  hasRateLimitDiagnostics,
  ProviderErrorReason,
} from './extract-provider-error-diagnostics.helper';

describe('hasRateLimitDiagnostics', () => {
  it.each(['no_capacity', 'rate_limit_exceeded', 'too_many_requests'])(
    'recognizes %s as an upstream code or type',
    (diagnostic) => {
      expect(hasRateLimitDiagnostics({ upstreamCode: diagnostic })).toBe(true);
      expect(hasRateLimitDiagnostics({ upstreamType: diagnostic })).toBe(true);
    },
  );

  it('recognizes HTTP 429 without provider diagnostics', () => {
    expect(hasRateLimitDiagnostics({ upstreamStatus: 429 })).toBe(true);
  });

  it('does not classify unrelated provider diagnostics', () => {
    expect(
      hasRateLimitDiagnostics({
        upstreamStatus: 400,
        upstreamCode: 'invalid_request_error',
      }),
    ).toBe(false);
  });
});

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
      upstreamReason: ProviderErrorReason.UNKNOWN_REQUEST_REJECTION,
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
      upstreamReason: ProviderErrorReason.UNKNOWN_REQUEST_REJECTION,
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

  it('extracts duration-formatted retry-after values such as StackIT sends', () => {
    const stackit = Object.assign(new Error('Request rate limited'), {
      status: 429,
      headers: new Headers({ 'retry-after': '2s' }),
    });

    expect(extractProviderErrorDiagnostics(stackit).upstreamRetryAfterMs).toBe(
      2_000,
    );
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
      upstreamReason: ProviderErrorReason.UNKNOWN_REQUEST_REJECTION,
    });
  });

  it('extracts a provider request ID from AWS metadata', () => {
    const error = Object.assign(new Error('Malformed input request'), {
      $metadata: {
        httpStatusCode: 400,
        requestId: 'aws-bedrock-request-123',
      },
    });

    expect(extractProviderErrorDiagnostics(error)).toMatchObject({
      upstreamStatus: 400,
      upstreamRequestId: 'aws-bedrock-request-123',
      upstreamReason: ProviderErrorReason.UNKNOWN_REQUEST_REJECTION,
    });
  });

  it('takes the context-length reason the provider package recognised', () => {
    const error = new ModelProviderError({
      kind: 'rejection',
      stage: 'stream_establishment',
      upstreamStatus: 400,
      rejectionReason: 'context_length_exceeded',
      cause: Object.assign(
        new Error('400 prompt is too long: 210950 tokens > 200000 maximum'),
        { status: 400 },
      ),
    });

    expect(extractProviderErrorDiagnostics(error)).toMatchObject({
      upstreamStatus: 400,
      upstreamReason: ProviderErrorReason.CONTEXT_LENGTH_EXCEEDED,
    });
  });

  it.each([
    ['invalid_tool_schema', ProviderErrorReason.INVALID_TOOL_SCHEMA],
    ['content_filter', ProviderErrorReason.CONTENT_FILTER],
    ['unsupported_parameter', ProviderErrorReason.UNSUPPORTED_PARAMETER],
    ['authentication_failed', ProviderErrorReason.AUTHENTICATION_FAILED],
    ['image_too_large', ProviderErrorReason.IMAGE_TOO_LARGE],
  ] as const)(
    'takes the %s reason the provider package recognised',
    (rejectionReason, upstreamReason) => {
      const error = new ModelProviderError({
        kind: 'rejection',
        stage: 'stream_establishment',
        upstreamStatus: 400,
        rejectionReason,
        cause: Object.assign(new Error('400 provider wording'), {
          status: 400,
        }),
      });

      expect(extractProviderErrorDiagnostics(error).upstreamReason).toBe(
        upstreamReason,
      );
    },
  );

  it('does not guess a reason from the wording of an unclassified rejection', () => {
    const error = Object.assign(
      new Error("This model's maximum context length is 32768 tokens"),
      { status: 400 },
    );

    expect(extractProviderErrorDiagnostics(error)).toMatchObject({
      upstreamReason: ProviderErrorReason.UNKNOWN_REQUEST_REJECTION,
    });
  });

  it('combines portable facts with safe rejection diagnostics from the cause', () => {
    const cause = Object.assign(
      new Error("Invalid tool schema containing resident prompt '…"),
      {
        status: 400,
        code: 'invalid_function_parameters',
        type: 'invalid_request_error',
        param: 'tools[4].function.parameters',
      },
    );
    const error = new ModelProviderError({
      kind: 'rejection',
      stage: 'stream_establishment',
      upstreamStatus: 400,
      upstreamRequestId: 'req_portable_456',
      cause,
    });

    expect(extractProviderErrorDiagnostics(error)).toEqual({
      upstreamStatus: 400,
      upstreamCode: 'invalid_function_parameters',
      upstreamType: 'invalid_request_error',
      upstreamParam: 'tools[4].function.parameters',
      upstreamRequestId: 'req_portable_456',
      upstreamReason: ProviderErrorReason.UNKNOWN_REQUEST_REJECTION,
    });
  });

  describe('extractProviderExplanation', () => {
    it('prefers the parsed error body over the SDK message', () => {
      const error = Object.assign(new Error('400 Invalid value for input'), {
        status: 400,
        error: { message: 'Invalid value for input', param: 'input' },
        response: { body: 'resident prompt text' },
      });

      const explanation = extractProviderExplanation(error);

      expect(explanation).toBe('Invalid value for input');
      expect(explanation).not.toContain('resident prompt text');
    });

    it('reads the explanation from a Mistral raw body', () => {
      const error = Object.assign(
        new Error(
          'API error occurred: Status 400 Body: {"object":"error","message":"Invalid tool name"}',
        ),
        {
          statusCode: 400,
          body: '{"object":"error","message":"Invalid tool name","type":"invalid_request_error"}',
        },
      );

      expect(extractProviderExplanation(error)).toBe('Invalid tool name');
    });

    it('joins validation messages from a Mistral raw body and drops the echoed input', () => {
      const error = Object.assign(
        new Error('Unprocessable Entity: Status 422. Body: {"detail":[]}'),
        {
          statusCode: 422,
          body: '{"detail":[{"type":"string_type","loc":["body","messages",2,"content"],"msg":"Input should be a valid string","input":"Sehr geehrte Frau Anna Muster, Ihr Antrag"},{"msg":"Field required","input":{"text":"resident data"}}]}',
        },
      );

      const explanation = extractProviderExplanation(error);

      expect(explanation).toBe(
        'Input should be a valid string; Field required',
      );
      expect(explanation).not.toContain('Anna');
      expect(explanation).not.toContain('resident data');
    });

    it('never exposes a body that only exists inside the SDK message', () => {
      const error = Object.assign(
        new Error(
          'API error occurred: Status 400\nBody: {"message":"resident text"}',
        ),
        { statusCode: 400 },
      );

      const explanation = extractProviderExplanation(error);

      expect(explanation).toBe('API error occurred: Status 400 Body: {\u2026');
      expect(explanation).not.toContain('resident text');
    });

    it('cuts the explanation before an echoed request value', () => {
      const error = Object.assign(
        new Error(
          "400 Invalid value: 'patient's record MRN-4451'. Supported values for 'input[2].type' are listed.",
        ),
        { status: 400 },
      );

      expect(extractProviderExplanation(error)).toBe(
        "400 Invalid value: '\u2026",
      );
    });

    it('returns undefined when the provider sent no message', () => {
      expect(extractProviderExplanation({ status: 400 })).toBeUndefined();
      expect(
        extractProviderExplanation(
          Object.assign(new Error('  \n '), { status: 400 }),
        ),
      ).toBeUndefined();
    });

    it('never travels inside the diagnostics object', () => {
      const error = Object.assign(new Error('400 Invalid value for input'), {
        status: 400,
        error: { message: 'Invalid value for input' },
      });

      expect(extractProviderErrorDiagnostics(error)).not.toHaveProperty(
        'upstreamMessage',
      );
    });

    it('reads a Bedrock-style message from the portable error cause', () => {
      const error = new ModelProviderError({
        kind: 'rejection',
        stage: 'stream_establishment',
        upstreamStatus: 400,
        cause: Object.assign(
          new Error('400 Malformed input request, please reformat your input'),
          { $metadata: { httpStatusCode: 400 } },
        ),
      });

      expect(extractProviderErrorDiagnostics(error)).toMatchObject({
        upstreamStatus: 400,
        upstreamReason: ProviderErrorReason.UNKNOWN_REQUEST_REJECTION,
      });
      expect(extractProviderExplanation(error)).toBe(
        '400 Malformed input request, please reformat your input',
      );
    });
  });
});
