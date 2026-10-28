import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { RolePermissionsRepository } from 'src/iam/permissions/application/ports/role-permissions.repository';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { CONFIGURABLE_ROLES } from 'src/iam/permissions/domain/default-role-permissions.constants';
import { UnexpectedPermissionError } from 'src/iam/permissions/application/permissions.errors';
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
    this.logger.log({ orgId: query.orgId }, 'Getting role permissions');

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
