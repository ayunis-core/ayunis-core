import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelModeDefaultLevel } from 'src/domain/models/domain/value-objects/model-mode-default-level.enum';
import type { DefaultModelSelectionOwner } from 'src/domain/models/domain/default-model-selection';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { TeamPermittedModelValidator } from 'src/domain/models/application/services/team-permitted-model-validator.service';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { GetEffectiveLanguageModelsQuery } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.query';

export interface ModelModeDefaultScope {
  target: DefaultModelSelectionOwner;
  /** Grants a mode default on this level resolves against. */
  grants: () => Promise<PermittedLanguageModel[]>;
}

/** Authorizes access to a level's mode default and names its grants. */
@Injectable()
export class ModelModeDefaultScopeService {
  constructor(
    private readonly contextService: ContextService,
    private readonly teamValidator: TeamPermittedModelValidator,
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly getEffectiveLanguageModelsUseCase: GetEffectiveLanguageModelsUseCase,
  ) {}

  async resolve(
    level: ModelModeDefaultLevel,
    teamId?: UUID,
  ): Promise<ModelModeDefaultScope> {
    const { userId, orgId } = getRequiredUserContext(this.contextService);
    switch (level) {
      case ModelModeDefaultLevel.USER:
        return {
          target: { userId },
          grants: async () =>
            (
              await this.getEffectiveLanguageModelsUseCase.execute(
                new GetEffectiveLanguageModelsQuery(orgId, userId),
              )
            ).models,
        };
      case ModelModeDefaultLevel.TEAM:
        return this.teamScope(orgId, teamId);
      case ModelModeDefaultLevel.ORG:
        this.teamValidator.validateAdminAccess(orgId);
        return {
          target: { orgId },
          grants: () => this.permittedModelsRepository.findManyLanguage(orgId),
        };
    }
  }

  private async teamScope(
    orgId: UUID,
    teamId: UUID | undefined,
  ): Promise<ModelModeDefaultScope> {
    if (!teamId) throw new TypeError('teamId is required for a team default');
    this.teamValidator.validateAdminAccess(orgId);
    await this.teamValidator.validateTeamInOrg(teamId, orgId);
    return {
      target: { teamId },
      grants: () =>
        this.permittedModelsRepository.findManyLanguageByTeam(teamId, orgId),
    };
  }
}
