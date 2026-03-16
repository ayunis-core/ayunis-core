import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { TeamValidationPort } from '../ports/team-validation.port';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { TeamNotFoundInOrgError } from '../models.errors';

@Injectable()
export class TeamPermittedModelValidator {
  constructor(
    private readonly teamValidationPort: TeamValidationPort,
    private readonly contextService: ContextService,
  ) {}

  validateAdminAccess(commandOrgId: UUID): void {
    const orgId = this.contextService.get('orgId');
    const orgRole = this.contextService.get('role');
    const systemRole = this.contextService.get('systemRole');
    const isOrgAdmin = orgRole === UserRole.ADMIN && orgId === commandOrgId;
    const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
    if (!isOrgAdmin && !isSuperAdmin) {
      throw new UnauthorizedAccessError();
    }
  }

  async validateTeamInOrg(teamId: UUID, orgId: UUID): Promise<void> {
    const exists = await this.teamValidationPort.existsInOrg(teamId, orgId);
    if (!exists) {
      throw new TeamNotFoundInOrgError(teamId);
    }
  }
}
