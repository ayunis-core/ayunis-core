import type { ConfigService } from '@nestjs/config';
import { PurgeExpiredInvitesUseCase } from './purge-expired-invites.use-case';
import type { InvitesRepository } from '../../ports/invites.repository';
import { UnexpectedInviteError } from '../../invites.errors';

describe('PurgeExpiredInvitesUseCase', () => {
  const NOW = new Date('2026-07-01T12:00:00.000Z');

  let invitesRepository: jest.Mocked<
    Pick<InvitesRepository, 'deleteExpiredBefore' | 'countExpiredBefore'>
  >;
  let configValues: Record<string, unknown>;
  let useCase: PurgeExpiredInvitesUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);

    invitesRepository = {
      deleteExpiredBefore: jest.fn(),
      countExpiredBefore: jest.fn(),
    };
    configValues = { 'purge.inviteGraceDays': 30, 'purge.dryRun': false };

    const configService = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    useCase = new PurgeExpiredInvitesUseCase(
      invitesRepository as unknown as InvitesRepository,
      configService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deletes invites expired more than the grace period ago', async () => {
    invitesRepository.deleteExpiredBefore.mockResolvedValue(5);

    const result = await useCase.execute();

    const expectedCutoff = new Date('2026-06-01T12:00:00.000Z');
    expect(invitesRepository.deleteExpiredBefore).toHaveBeenCalledWith(
      expectedCutoff,
    );
    expect(invitesRepository.countExpiredBefore).not.toHaveBeenCalled();
    expect(result).toEqual({
      deletedCount: 5,
      matchedCount: 5,
      cutoff: expectedCutoff,
      graceDays: 30,
      dryRun: false,
    });
  });

  it('only reports the impact without deleting in dry-run mode', async () => {
    configValues['purge.dryRun'] = true;
    invitesRepository.countExpiredBefore.mockResolvedValue(9);

    const result = await useCase.execute();

    expect(invitesRepository.countExpiredBefore).toHaveBeenCalledWith(
      new Date('2026-06-01T12:00:00.000Z'),
    );
    expect(invitesRepository.deleteExpiredBefore).not.toHaveBeenCalled();
    expect(result.deletedCount).toBe(0);
    expect(result.matchedCount).toBe(9);
    expect(result.dryRun).toBe(true);
  });

  it('falls back to a 30-day grace period when config is missing', async () => {
    delete configValues['purge.inviteGraceDays'];
    invitesRepository.deleteExpiredBefore.mockResolvedValue(0);

    const result = await useCase.execute();

    expect(result.graceDays).toBe(30);
    expect(invitesRepository.deleteExpiredBefore).toHaveBeenCalledWith(
      new Date('2026-06-01T12:00:00.000Z'),
    );
  });

  it('purges immediately at expiry when the grace period is zero', async () => {
    configValues['purge.inviteGraceDays'] = 0;
    invitesRepository.deleteExpiredBefore.mockResolvedValue(2);

    await useCase.execute();

    expect(invitesRepository.deleteExpiredBefore).toHaveBeenCalledWith(NOW);
  });

  it('wraps unexpected repository failures in UnexpectedInviteError', async () => {
    invitesRepository.deleteExpiredBefore.mockRejectedValue(
      new Error('connection reset'),
    );

    await expect(useCase.execute()).rejects.toBeInstanceOf(
      UnexpectedInviteError,
    );
  });
});
