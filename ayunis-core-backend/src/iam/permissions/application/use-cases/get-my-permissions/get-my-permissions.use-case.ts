import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { RolePermissionsRepository } from '../../ports/role-permissions.repository';
import { Permission } from '../../../domain/value-objects/permission.enum';
import { UnexpectedPermissionError } from '../../permissions.errors';
import { GetMyPermissionsQuery } from './get-my-permissions.query';

@Injectable()
export class GetMyPermissionsUseCase {
  constructor(
    private readonly rolePermissionsRepository: RolePermissionsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedPermissionError)
  async execute(query: GetMyPermissionsQuery): Promise<Permission[]> {
    // Admins implicitly hold every permission.
    if (query.role === UserRole.ADMIN) {
      return Object.values(Permission);
    }

    const grants = await this.rolePermissionsRepository.findByOrgId(
      query.orgId,
    );
    return grants
      .filter((grant) => grant.role === query.role)
      .map((grant) => grant.permission);
  }
}
