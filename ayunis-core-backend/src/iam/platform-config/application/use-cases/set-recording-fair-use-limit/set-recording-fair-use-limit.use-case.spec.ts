import { SetRecordingFairUseLimitUseCase } from './set-recording-fair-use-limit.use-case';
import { SetRecordingFairUseLimitCommand } from './set-recording-fair-use-limit.command';
import type { PlatformConfigRepositoryPort } from 'src/iam/platform-config/application/ports/platform-config.repository';
import { PlatformConfigInvalidValueError } from 'src/iam/platform-config/application/platform-config.errors';
import { PlatformConfigKey } from 'src/iam/platform-config/domain/platform-config-keys.enum';

describe('SetRecordingFairUseLimitUseCase', () => {
  let useCase: SetRecordingFairUseLimitUseCase;
  let repository: jest.Mocked<PlatformConfigRepositoryPort>;

  beforeEach(() => {
    repository = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      setMany: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new SetRecordingFairUseLimitUseCase(repository);
  });

  it('writes the recordings limit and window together, so no upload sees half a change', async () => {
    await useCase.execute(
      new SetRecordingFairUseLimitCommand({ limit: 8, windowMs: 7200000 }),
    );

    expect(repository.setMany).toHaveBeenCalledWith(
      new Map<PlatformConfigKey, string>([
        [PlatformConfigKey.FAIR_USE_RECORDINGS_LIMIT, '8'],
        [PlatformConfigKey.FAIR_USE_RECORDINGS_WINDOW_MS, '7200000'],
      ]),
    );
  });

  it.each([
    { limit: 0, windowMs: 3600000 },
    { limit: 2.5, windowMs: 3600000 },
    { limit: 5, windowMs: 0 },
    { limit: 5, windowMs: Number.NaN },
  ])(
    'keeps the stored limit when the new one is not a positive integer ($limit per $windowMs ms)',
    async (values) => {
      await expect(
        useCase.execute(new SetRecordingFairUseLimitCommand(values)),
      ).rejects.toThrow(PlatformConfigInvalidValueError);
      expect(repository.setMany).not.toHaveBeenCalled();
    },
  );
});
