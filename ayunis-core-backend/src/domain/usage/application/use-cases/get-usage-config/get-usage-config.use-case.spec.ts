import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { GetUsageConfigQuery } from './get-usage-config.query';
import { GetUsageConfigUseCase } from './get-usage-config.use-case';

describe('GetUsageConfigUseCase', () => {
  const findOrg = { execute: jest.fn() };
  const context = {
    get: jest.fn().mockReturnValue('11111111-1111-1111-1111-111111111111'),
  };
  const config = { get: jest.fn().mockReturnValue(true) };
  const useCase = new GetUsageConfigUseCase(
    findOrg as never,
    context as never,
    config as never,
  );
  it.each([true, false])(
    'returns the current organisation visibility setting (%s)',
    async (hideIndividualUsage) => {
      findOrg.execute.mockResolvedValue({ hideIndividualUsage });
      await expect(useCase.execute()).resolves.toEqual({
        isSelfHosted: true,
        hideIndividualUsage,
      });
    },
  );
  it('reads the target organisation setting for a super admin from another organisation', async () => {
    context.get.mockImplementation(
      getFromUserContext({ systemRole: SystemRole.SUPER_ADMIN }),
    );
    const target = '33333333-3333-4333-8333-333333333333';
    findOrg.execute.mockImplementation(async ({ id }: { id: string }) => ({
      hideIndividualUsage: id === target,
    }));
    await expect(
      useCase.execute(new GetUsageConfigQuery(target)),
    ).resolves.toEqual({ isSelfHosted: true, hideIndividualUsage: true });
  });
  it('rejects an org admin requesting another organisation config', async () => {
    context.get.mockImplementation(
      getFromUserContext({ role: UserRole.ADMIN }),
    );
    await expect(
      useCase.execute(
        new GetUsageConfigQuery('33333333-3333-4333-8333-333333333333'),
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
  });
});
