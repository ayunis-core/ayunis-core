import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { RolePermissionsRepository } from '../../ports/role-permissions.repository';
import { UnexpectedPermissionError } from '../../permissions.errors';
import { HasPermissionQuery } from './has-permission.query';

@Injectable()
export class HasPermissionUseCase {
  constructor(
    private readonly rolePermissionsRepository: RolePermissionsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedPermissionError)
  async execute(query: HasPermissionQuery): Promise<boolean> {
    // Admins implicitly hold every permission and are never persisted.
    if (query.role === UserRole.ADMIN) {
      return true;
    }

    return this.rolePermissionsRepository.existsForRole(
      query.orgId,
      query.role,
      query.permission,
    );
  }
}
