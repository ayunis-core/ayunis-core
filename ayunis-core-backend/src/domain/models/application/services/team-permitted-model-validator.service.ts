import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { GetTeamQuery } from 'src/iam/teams/application/use-cases/get-team/get-team.query';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserPrincipal } from 'src/common/context/required-context';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  PermittedModelNotFoundError,
  PermittedModelNotInTeamError,
  TeamNotFoundInOrgError,
} from 'src/domain/models/application/models.errors';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import type { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';

@Injectable()
export class TeamPermittedModelValidator {
  constructor(
    private readonly getTeamUseCase: GetTeamUseCase,
    private readonly contextService: ContextService,
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  validateAdminAccess(commandOrgId: UUID): void {
    const principal = getRequiredUserPrincipal(this.contextService);
    const isOrgAdmin =
      principal.role === UserRole.ADMIN && principal.orgId === commandOrgId;
    const isSuperAdmin = principal.systemRole === SystemRole.SUPER_ADMIN;
    if (!isOrgAdmin && !isSuperAdmin) {
      throw new UnauthorizedAccessError();
    }
  }

  async validateTeamInOrg(teamId: UUID, orgId: UUID): Promise<void> {
    try {
      const team = await this.getTeamUseCase.execute(new GetTeamQuery(teamId));
      if (team.orgId !== orgId) {
        throw new TeamNotFoundInOrgError(teamId);
      }
    } catch (error) {
      if (error instanceof TeamNotFoundError) {
        throw new TeamNotFoundInOrgError(teamId);
      }
      throw error;
    }
  }

  async validateModelBelongsToTeam(
    permittedModelId: UUID,
    teamId: UUID,
    orgId: UUID,
  ): Promise<PermittedModel> {
    const model = await this.permittedModelsRepository.findOne({
      id: permittedModelId,
      orgId,
    });

    if (!model) {
      throw new PermittedModelNotFoundError(permittedModelId);
    }

    if (model.scope !== PermittedModelScope.TEAM || model.scopeId !== teamId) {
      throw new PermittedModelNotInTeamError(permittedModelId, teamId);
    }

    return model;
  }
}
