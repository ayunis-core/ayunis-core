import { ProviderServerError } from 'src/common/errors/provider.errors';
import { serializeRuntimeModelError } from './runtime-model-error';

describe('serializeRuntimeModelError', () => {
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
});
