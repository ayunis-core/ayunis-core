import {
  getFromUserContext,
  getFromStore,
} from 'src/common/context/testing/context.fixtures';
import { SetOrgUsageVisibilityUseCase } from './set-org-usage-visibility.use-case';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { UUID } from 'crypto';

const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
describe('SetOrgUsageVisibilityUseCase', () => {
  const repository = { updateUsageVisibility: jest.fn() };
  const context = { get: jest.fn() };
  const useCase = new SetOrgUsageVisibilityUseCase(
    repository as never,
    context as never,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    context.get.mockImplementation(
      getFromUserContext({ orgId, systemRole: SystemRole.SUPER_ADMIN }),
    );
    repository.updateUsageVisibility.mockImplementation(
      (_id: UUID, hideIndividualUsage: boolean) =>
        Promise.resolve(
          new Org({ id: orgId, name: 'Stadt Leverkusen', hideIndividualUsage }),
        ),
    );
  });
  it.each([true, false])(
    'persists hideIndividualUsage=%s for super admins',
    async (hideIndividualUsage) => {
      await expect(
        useCase.execute({ orgId, hideIndividualUsage }),
      ).resolves.toMatchObject({
        id: orgId,
        name: 'Stadt Leverkusen',
        hideIndividualUsage,
      });
    },
  );
  it.each([SystemRole.CUSTOMER, undefined])(
    'denies a principal without super admin privileges (%s)',
    async (role) => {
      context.get.mockImplementation(
        getFromUserContext({ orgId, systemRole: role }),
      );
      await expect(
        useCase.execute({ orgId, hideIndividualUsage: true }),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(repository.updateUsageVisibility).not.toHaveBeenCalled();
    },
  );
  it('denies a role-bearing context that is not backed by a user', async () => {
    context.get.mockImplementation(
      getFromStore({ orgId, systemRole: SystemRole.SUPER_ADMIN }),
    );
    await expect(
      useCase.execute({ orgId, hideIndividualUsage: true }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('defaults new organisations to visible individual usage', () => {
    expect(new Org({ name: 'Stadt Leverkusen' }).hideIndividualUsage).toBe(
      false,
    );
  });
});
