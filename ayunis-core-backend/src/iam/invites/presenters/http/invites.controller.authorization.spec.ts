import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

import { InvitesController } from './invites.controller';

describe('InvitesController authorization', () => {
  const reflector = new Reflector();

  it('requires tenant-admin authorization to create a single invite', () => {
    const roles = reflector.get<UserRole[]>(
      ROLES_KEY,
      InvitesController.prototype.create,
    );

    expect(roles).toEqual([UserRole.ADMIN]);
  });
});
