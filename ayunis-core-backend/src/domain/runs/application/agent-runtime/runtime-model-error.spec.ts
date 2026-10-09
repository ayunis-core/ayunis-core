import { ProviderServerError } from 'src/common/errors/provider.errors';
import { AnonymizationPostDetectionError } from 'src/common/anonymization/application/anonymization.errors';
import {
  reconstructRuntimeAnonymizationError,
  reconstructRuntimeModelError,
  serializeRuntimeAnonymizationError,
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
          upstreamCode: 'temporarily_unavailable',
          upstreamType: 'server_error',
          upstreamParam: 'tools[3].parameters',
          upstreamReason: 'invalid_tool_schema',
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
        upstreamCode: 'temporarily_unavailable',
        upstreamType: 'server_error',
        upstreamParam: 'tools[3].parameters',
        upstreamReason: 'invalid_tool_schema',
        upstreamRequestId: 'req_anonymize_503',
        failureStage: 'stream_establishment',
      },
    });
  });
});

describe('runtime post-detection anonymization error serialization', () => {
  it('round-trips only allowlisted diagnostic metadata', () => {
    const error = new AnonymizationPostDetectionError(
      'mask_application',
      3_851,
      1,
    );
    const metadata = error.metadata;
    expect(metadata).toBeDefined();
    if (!metadata) throw new Error('expected diagnostic metadata');
    Object.assign(metadata, {
      rawText: 'classified resident record',
      databaseConstraint: 'safe_constraint_name',
      causeType: 'TypeError',
    });

    const serialized = serializeRuntimeAnonymizationError(error);
    const reconstructed = reconstructRuntimeAnonymizationError(serialized);

    expect(serialized).toEqual({
      hostError: {
        type: 'anonymization_post_detection_failure',
        context: {
          code: 'ANONYMIZATION_MASK_APPLICATION_FAILED',
          stage: 'mask_application',
          textLength: 3_851,
          detectionCount: 1,
          databaseConstraint: 'safe_constraint_name',
          causeType: 'TypeError',
        },
      },
    });
    expect(JSON.stringify(serialized)).not.toContain('classified resident');
    expect(reconstructed).toMatchObject({
      name: 'ANONYMIZATION_MASK_APPLICATION_FAILED',
      code: 'ANONYMIZATION_MASK_APPLICATION_FAILED',
      metadata: {
        stage: 'mask_application',
        textLength: 3_851,
        detectionCount: 1,
        causeType: 'TypeError',
      },
    });
  });
});
