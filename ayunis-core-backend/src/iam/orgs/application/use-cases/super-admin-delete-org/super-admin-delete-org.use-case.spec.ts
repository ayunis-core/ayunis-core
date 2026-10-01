import { SuperAdminDeleteOrgUseCase } from './super-admin-delete-org.use-case';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { Org } from 'src/iam/orgs/domain/org.entity';
import type { UUID } from 'crypto';
const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
describe('SuperAdminDeleteOrgUseCase', () => {
  const repository = { findById: jest.fn() };
  const deletion = { execute: jest.fn() };
  const context = { get: jest.fn() };
  const useCase = new SuperAdminDeleteOrgUseCase(
    repository as never,
    deletion as never,
    context as never,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    context.get.mockReturnValue(SystemRole.SUPER_ADMIN);
    repository.findById.mockResolvedValue(
      new Org({ id: orgId, name: 'Stadt Musterhausen' }),
    );
  });
  it.each([false, true])(
    'deletes an active or archived org (%s) with exact confirmation',
    async (archived) => {
      repository.findById.mockResolvedValue(
        new Org({ id: orgId, name: 'Stadt Musterhausen', archived }),
      );
      await useCase.execute({ orgId, confirmationName: 'Stadt Musterhausen' });
      expect(deletion.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: orgId,
          confirmationName: 'Stadt Musterhausen',
          requireCompleteCleanup: true,
        }),
      );
    },
  );
  it.each(['stadt musterhausen', 'Stadt Musterhausen ', ''])(
    'rejects mismatched confirmation %p without deleting',
    async (confirmationName) => {
      await expect(
        useCase.execute({ orgId, confirmationName }),
      ).rejects.toMatchObject({ code: 'ORG_DELETE_CONFIRMATION_MISMATCH' });
      expect(deletion.execute).not.toHaveBeenCalled();
    },
  );
  it('rejects customers before loading organisation data', async () => {
    context.get.mockReturnValue(SystemRole.CUSTOMER);
    await expect(
      useCase.execute({ orgId, confirmationName: 'Stadt Musterhausen' }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.findById).not.toHaveBeenCalled();
  });
});
