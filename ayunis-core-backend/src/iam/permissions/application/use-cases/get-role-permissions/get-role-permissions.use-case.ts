import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { RolePermissionsRepository } from '../../ports/role-permissions.repository';
import { Permission } from '../../../domain/value-objects/permission.enum';
import { CONFIGURABLE_ROLES } from '../../../domain/default-role-permissions.constants';
import { UnexpectedPermissionError } from '../../permissions.errors';
import { GetRolePermissionsQuery } from './get-role-permissions.query';

export interface RolePermissionSet {
  role: UserRole;
  permissions: Permission[];
}

@Injectable()
export class GetRolePermissionsUseCase {
  private readonly logger = new Logger(GetRolePermissionsUseCase.name);

  constructor(
    private readonly rolePermissionsRepository: RolePermissionsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedPermissionError)
  async execute(query: GetRolePermissionsQuery): Promise<RolePermissionSet[]> {
    this.logger.log('Getting role permissions', { orgId: query.orgId });

    const grants = await this.rolePermissionsRepository.findByOrgId(
      query.orgId,
    );

    return CONFIGURABLE_ROLES.map((role) => ({
      role,
      permissions: grants
        .filter((grant) => grant.role === role)
        .map((grant) => grant.permission),
    }));
  }
}
