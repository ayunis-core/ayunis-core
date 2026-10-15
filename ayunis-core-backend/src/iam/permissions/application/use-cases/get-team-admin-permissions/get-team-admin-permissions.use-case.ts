import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TeamAdminPermissionsRepository } from 'src/iam/permissions/application/ports/team-admin-permissions.repository';
import { UnexpectedPermissionError } from 'src/iam/permissions/application/permissions.errors';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';

@Injectable()
export class GetTeamAdminPermissionsUseCase {
  constructor(
    private readonly teamAdminPermissionsRepository: TeamAdminPermissionsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedPermissionError)
  async execute(orgId: UUID): Promise<TeamAdminPermission[]> {
    const granted =
      await this.teamAdminPermissionsRepository.findByOrgId(orgId);
    return Object.values(TeamAdminPermission).filter((permission) =>
      granted.includes(permission),
    );
  }
}
