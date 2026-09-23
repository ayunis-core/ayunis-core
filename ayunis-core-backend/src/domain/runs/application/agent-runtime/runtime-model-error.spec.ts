import { ProviderServerError } from 'src/common/errors/provider.errors';
import {
  reconstructRuntimeModelError,
  serializeRuntimeModelError,
} from './runtime-model-error';

describe('runtime anonymization provider error serialization', () => {
  it('does not serialize raw provider cause messages', () => {
    const error = new ProviderServerError(
      {
        provider: 'azure',
        modelId: 'gpt-5.2',
        upstreamStatus: 503,
        upstreamRequestId: 'req_azure_503',
      },
      new Error("provider echoed prompt 'classified resident record'"),
    );

    const serialized = serializeRuntimeModelError(error, 180_000);

    expect(serialized).toEqual({
      hostError: {
        type: 'provider_server',
        context: {
          provider: 'azure',
          modelId: 'gpt-5.2',
          upstreamStatus: 503,
          upstreamRequestId: 'req_azure_503',
        },
      },
    });
    expect(JSON.stringify(serialized)).not.toContain('classified resident');
  });

  it('reconstructs safe provider metadata for AppSignal grouping', () => {
    const reconstructed = reconstructRuntimeModelError({
      hostError: {
        type: 'provider_server',
        context: {
          provider: 'anonymize',
          upstreamStatus: 503,
          upstreamRequestId: 'req_anonymize_503',
          failureStage: 'stream_establishment',
        },
      },
    });

    expect(reconstructed).toBeInstanceOf(ProviderServerError);
    expect(reconstructed).toMatchObject({
      code: 'PROVIDER_UNAVAILABLE_SERVER_ANONYMIZE',
      context: {
        provider: 'anonymize',
        upstreamStatus: 503,
        upstreamRequestId: 'req_anonymize_503',
        failureStage: 'stream_establishment',
      },
    });
  });
});
