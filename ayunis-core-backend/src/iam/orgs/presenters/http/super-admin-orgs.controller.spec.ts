import { SYSTEM_ROLES_KEY } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { CreateOrgCommand } from 'src/iam/orgs/application/use-cases/create-org/create-org.command';
import { UpdateOrgCommand } from 'src/iam/orgs/application/use-cases/update-org/update-org.command';
import { SuperAdminOrgsController } from 'src/iam/orgs/presenters/http/super-admin-orgs.controller';
import { SuperAdminOrgResponseDtoMapper } from 'src/iam/orgs/presenters/http/mappers/super-admin-org-response-dto.mapper';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { UUID } from 'crypto';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;

function createController() {
  const getAllOrgs = { execute: jest.fn() };
  const findOrgById = { execute: jest.fn() };
  const createOrg = { execute: jest.fn() };
  const updateOrg = { execute: jest.fn() };
  return {
    controller: new SuperAdminOrgsController(
      getAllOrgs as never,
      new SuperAdminOrgResponseDtoMapper(),
      findOrgById as never,
      createOrg as never,
      updateOrg as never,
    ),
    getAllOrgs,
    findOrgById,
    createOrg,
    updateOrg,
  };
}

describe(SuperAdminOrgsController.name, () => {
  it('is restricted to super admins', () => {
    expect(
      Reflect.getMetadata(SYSTEM_ROLES_KEY, SuperAdminOrgsController),
    ).toEqual([SystemRole.SUPER_ADMIN]);
  });

  it('creates an organization through the application use case', async () => {
    const { controller, createOrg } = createController();
    const createdAt = new Date('2024-01-15T10:30:00Z');
    createOrg.execute.mockResolvedValue(
      new Org({ id: ORG_ID, name: 'Acme Corporation', createdAt }),
    );

    await expect(
      controller.createOrg({ name: 'Acme Corporation' }),
    ).resolves.toEqual({
      id: ORG_ID,
      name: 'Acme Corporation',
      createdAt,
    });
    expect(createOrg.execute).toHaveBeenCalledWith(
      new CreateOrgCommand('Acme Corporation'),
    );
  });

  it('renames an organization through the application use case', async () => {
    const { controller, updateOrg } = createController();
    const createdAt = new Date('2024-01-15T10:30:00Z');
    updateOrg.execute.mockResolvedValue(
      new Org({ id: ORG_ID, name: 'Renamed Corporation', createdAt }),
    );

    await expect(
      controller.updateOrg(ORG_ID, { name: 'Renamed Corporation' }),
    ).resolves.toEqual({
      id: ORG_ID,
      name: 'Renamed Corporation',
      createdAt,
    });
    expect(updateOrg.execute).toHaveBeenCalledWith(
      new UpdateOrgCommand(ORG_ID, 'Renamed Corporation'),
    );
  });
});
