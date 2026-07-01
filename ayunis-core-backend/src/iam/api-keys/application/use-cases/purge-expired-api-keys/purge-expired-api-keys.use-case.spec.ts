import type { ConfigService } from '@nestjs/config';
import { PurgeExpiredApiKeysUseCase } from './purge-expired-api-keys.use-case';
import type { ApiKeysRepository } from '../../ports/api-keys.repository';
import { UnexpectedApiKeyError } from '../../api-keys.errors';

describe('PurgeExpiredApiKeysUseCase', () => {
  const NOW = new Date('2026-07-01T12:00:00.000Z');

  let apiKeysRepository: jest.Mocked<
    Pick<ApiKeysRepository, 'deleteExpiredBefore' | 'countExpiredBefore'>
  >;
  let configValues: Record<string, unknown>;
  let useCase: PurgeExpiredApiKeysUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);

    apiKeysRepository = {
      deleteExpiredBefore: jest.fn(),
      countExpiredBefore: jest.fn(),
    };
    configValues = { 'purge.apiKeyGraceDays': 30, 'purge.dryRun': false };

    const configService = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    useCase = new PurgeExpiredApiKeysUseCase(
      apiKeysRepository as unknown as ApiKeysRepository,
      configService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deletes keys expired more than the grace period ago', async () => {
    apiKeysRepository.deleteExpiredBefore.mockResolvedValue(4);

    const result = await useCase.execute();

    const expectedCutoff = new Date('2026-06-01T12:00:00.000Z');
    expect(apiKeysRepository.deleteExpiredBefore).toHaveBeenCalledWith(
      expectedCutoff,
    );
    expect(apiKeysRepository.countExpiredBefore).not.toHaveBeenCalled();
    expect(result).toEqual({
      deletedCount: 4,
      matchedCount: 4,
      cutoff: expectedCutoff,
      graceDays: 30,
      dryRun: false,
    });
  });

  it('only reports the impact without deleting in dry-run mode', async () => {
    configValues['purge.dryRun'] = true;
    apiKeysRepository.countExpiredBefore.mockResolvedValue(8);

    const result = await useCase.execute();

    expect(apiKeysRepository.countExpiredBefore).toHaveBeenCalledWith(
      new Date('2026-06-01T12:00:00.000Z'),
    );
    expect(apiKeysRepository.deleteExpiredBefore).not.toHaveBeenCalled();
    expect(result.deletedCount).toBe(0);
    expect(result.matchedCount).toBe(8);
    expect(result.dryRun).toBe(true);
  });

  it('falls back to a 30-day grace period when config is missing', async () => {
    delete configValues['purge.apiKeyGraceDays'];
    apiKeysRepository.deleteExpiredBefore.mockResolvedValue(0);

    const result = await useCase.execute();

    expect(result.graceDays).toBe(30);
    expect(apiKeysRepository.deleteExpiredBefore).toHaveBeenCalledWith(
      new Date('2026-06-01T12:00:00.000Z'),
    );
  });

  it('wraps unexpected repository failures in UnexpectedApiKeyError', async () => {
    apiKeysRepository.deleteExpiredBefore.mockRejectedValue(
      new Error('connection reset'),
    );

    await expect(useCase.execute()).rejects.toBeInstanceOf(
      UnexpectedApiKeyError,
    );
  });
});
