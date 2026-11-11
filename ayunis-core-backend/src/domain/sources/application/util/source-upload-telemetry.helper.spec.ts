import { Appsignal } from '@appsignal/nodejs';
import { buildUploadSession } from 'src/domain/sources/application/testing/source-upload.fixtures';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';
import { recordSourceUploadOutcome } from './source-upload-telemetry.helper';

jest.mock('@appsignal/nodejs', () => ({
  Appsignal: { client: { isActive: true, metrics: jest.fn() } },
}));

describe('recordSourceUploadOutcome', () => {
  const metrics = { incrementCounter: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Appsignal.client.metrics).mockReturnValue(metrics as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('tags the counter with outcome, target kind and transfer mode and nothing that identifies a user, organisation or file', () => {
    recordSourceUploadOutcome(
      'expired',
      buildUploadSession({
        targetType: SourceUploadTargetType.KNOWLEDGE_BASE,
        multipart: true,
      }),
    );

    expect(metrics.incrementCounter.mock.calls).toEqual([
      [
        'source_upload_session_count',
        1,
        {
          outcome: 'expired',
          target_type: 'knowledge_base',
          multipart: 'true',
        },
      ],
    ]);
  });

  it('records nothing while AppSignal is inactive', () => {
    jest.replaceProperty(Appsignal.client, 'isActive', false);

    recordSourceUploadOutcome('created', buildUploadSession());

    expect(metrics.incrementCounter).not.toHaveBeenCalled();
  });

  it('does not throw when AppSignal was never started', () => {
    jest.replaceProperty(Appsignal, 'client', undefined as never);

    expect(() =>
      recordSourceUploadOutcome('created', buildUploadSession()),
    ).not.toThrow();
  });

  it('does not throw when the metrics client fails', () => {
    metrics.incrementCounter.mockImplementationOnce(() => {
      throw new Error('appsignal extension unavailable');
    });

    expect(() =>
      recordSourceUploadOutcome('aborted', buildUploadSession()),
    ).not.toThrow();
  });
});
