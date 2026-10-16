import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ROLES_KEY } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { TeamAdminPermissionsController } from './team-admin-permissions.controller';
import { UpdateTeamAdminPermissionsDto } from './dtos/team-admin-permissions.dto';

const errorsFor = (permissions: unknown) =>
  validate(plainToInstance(UpdateTeamAdminPermissionsDto, { permissions }));

describe(TeamAdminPermissionsController.name, () => {
  it('is reserved for organization admins', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, TeamAdminPermissionsController),
    ).toEqual([UserRole.ADMIN]);
  });

  it('accepts an empty set of team admin rights', async () => {
    await expect(errorsFor([])).resolves.toHaveLength(0);
  });

  it('rejects unknown and duplicate rights', async () => {
    await expect(errorsFor(['manage_teams'])).resolves.not.toHaveLength(0);
    await expect(
      errorsFor(['team_manage_members', 'team_manage_members']),
    ).resolves.not.toHaveLength(0);
  });
});
