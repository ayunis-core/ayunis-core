import { UpdateTrialUseCase } from './update-trial.use-case';
import { UpdateTrialCommand } from './update-trial.command';
import { Trial } from 'src/iam/trials/domain/trial.entity';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { TrialNotFoundError } from 'src/iam/trials/application/trial.errors';
import type { UUID } from 'crypto';

const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
const userId = '22222222-2222-2222-2222-222222222222' as UUID;

describe('UpdateTrialUseCase', () => {
  const repository = { findByOrgId: jest.fn(), update: jest.fn() };
  const store: Record<string, unknown> = {};
  const context = { get: jest.fn((key: string) => store[key]) };
  const useCase = new UpdateTrialUseCase(repository as never, context as never);

  const setStore = (values: Record<string, unknown>) => {
    for (const key of Object.keys(store)) delete store[key];
    Object.assign(store, values);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setStore({
      userId,
      orgId,
      role: UserRole.ADMIN,
      systemRole: SystemRole.SUPER_ADMIN,
    });
    repository.findByOrgId.mockResolvedValue(
      new Trial({ orgId, maxMessages: 10, messagesSent: 2 }),
    );
    repository.update.mockImplementation((trial: Trial) =>
      Promise.resolve(trial),
    );
  });

  it('updates the trial for a super admin', async () => {
    const result = await useCase.execute(
      new UpdateTrialCommand(orgId, 50, undefined),
    );

    expect(result.maxMessages).toBe(50);
    expect(result.messagesSent).toBe(2);
    expect(repository.update).toHaveBeenCalledTimes(1);
  });

  it('throws when the trial does not exist', async () => {
    repository.findByOrgId.mockResolvedValue(null);

    await expect(
      useCase.execute(new UpdateTrialCommand(orgId, 50)),
    ).rejects.toBeInstanceOf(TrialNotFoundError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects an org admin without super-admin privileges', async () => {
    setStore({
      userId,
      orgId,
      role: UserRole.ADMIN,
      systemRole: SystemRole.CUSTOMER,
    });

    await expect(
      useCase.execute(new UpdateTrialCommand(orgId, 50)),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(repository.findByOrgId).not.toHaveBeenCalled();
  });

  it('rejects an api-key context even if a system role leaked into the store', async () => {
    setStore({ apiKeyId: userId, orgId, systemRole: SystemRole.SUPER_ADMIN });

    await expect(
      useCase.execute(new UpdateTrialCommand(orgId, 50)),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(repository.findByOrgId).not.toHaveBeenCalled();
  });
});
