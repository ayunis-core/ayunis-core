import type { DataSource, EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
import { LocalRolePermissionsRepository } from './local-role-permissions.repository';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

describe('LocalRolePermissionsRepository transactions', () => {
  function build(isTransactionActive: boolean) {
    const manager = {
      delete: jest.fn().mockResolvedValue({}),
      save: jest.fn().mockResolvedValue([]),
    } as unknown as EntityManager;
    const dataSourceTransaction = jest
      .fn()
      .mockImplementation(
        (work: (manager: EntityManager) => Promise<unknown>) => work(manager),
      );
    const repository = new LocalRolePermissionsRepository(
      { transaction: dataSourceTransaction } as unknown as DataSource,
      {
        tx: manager,
        isTransactionActive: () => isTransactionActive,
      } as never,
    );

    return { repository, dataSourceTransaction, manager };
  }

  async function setAdminPermissions(
    repository: LocalRolePermissionsRepository,
  ): Promise<void> {
    await repository.setForRoles(randomUUID(), [
      {
        role: UserRole.ADMIN,
        permissions: [Permission.MANAGE_TEAMS],
      },
    ]);
  }

  it('opens its own transaction when no transaction is active', async () => {
    const { repository, dataSourceTransaction } = build(false);

    await setAdminPermissions(repository);

    expect(dataSourceTransaction).toHaveBeenCalledTimes(1);
  });

  it('joins the ambient transaction instead of opening a nested one', async () => {
    const { repository, dataSourceTransaction, manager } = build(true);

    await setAdminPermissions(repository);

    expect(dataSourceTransaction).not.toHaveBeenCalled();
    expect(manager.delete).toHaveBeenCalled();
    expect(manager.save).toHaveBeenCalled();
  });
});
