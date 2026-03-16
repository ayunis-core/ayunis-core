import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ContextService } from 'src/common/context/services/context.service';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UnexpectedModelError } from '../../models.errors';
import { TeamMembershipPort } from '../../ports/team-membership.port';
import { GetEffectiveLanguageModelsQuery } from './get-effective-language-models.query';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { EffectiveLanguageModelsResult } from './effective-language-models-result';

@Injectable()
export class GetEffectiveLanguageModelsUseCase {
  private readonly logger = new Logger(GetEffectiveLanguageModelsUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly teamMembershipPort: TeamMembershipPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    query: GetEffectiveLanguageModelsQuery,
  ): Promise<EffectiveLanguageModelsResult> {
    this.logger.log('Resolving effective language models', {
      userId: query.userId,
      orgId: query.orgId,
    });

    try {
      this.validateOrgAccess(query.orgId);

      if (!query.userId) {
        return this.buildOrgFallback(query.orgId);
      }

      return this.resolveForUser(query.userId, query.orgId);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error resolving effective language models', {
        userId: query.userId,
        orgId: query.orgId,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw new UnexpectedModelError(error as Error);
    }
  }

  private validateOrgAccess(queryOrgId: UUID): void {
    const orgId = this.contextService.get('orgId');
    const systemRole = this.contextService.get('systemRole');
    const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
    const isFromOrg = orgId === queryOrgId;
    if (!isFromOrg && !isSuperAdmin) {
      throw new UnauthorizedAccessError();
    }
  }

  private async resolveForUser(
    userId: UUID,
    orgId: UUID,
  ): Promise<EffectiveLanguageModelsResult> {
    const teams = await this.teamMembershipPort.findTeamsByUserIdAndOrg(
      userId,
      orgId,
    );

    const overrideTeams = teams.filter((team) => team.modelOverrideEnabled);
    const overrideTeamIds = overrideTeams.map((t) => t.id);

    if (overrideTeams.length === 0) {
      this.logger.debug('No override teams found, returning org-level models', {
        userId,
        orgId,
      });
      return this.buildOrgFallback(orgId);
    }

    const merged = await this.mergeTeamModels(overrideTeamIds, orgId);

    if (merged.length === 0) {
      this.logger.debug(
        'Override teams have no configured models, falling back to org-level models',
        { userId, orgId },
      );
      return this.buildOrgFallback(orgId);
    }

    return { models: merged, overrideTeamIds };
  }

  private async buildOrgFallback(
    orgId: UUID,
  ): Promise<EffectiveLanguageModelsResult> {
    const models = await this.permittedModelsRepository.findManyLanguage(orgId);
    return { models, overrideTeamIds: [] };
  }

  private async mergeTeamModels(
    teamIds: UUID[],
    orgId: UUID,
  ): Promise<PermittedLanguageModel[]> {
    const teamModelArrays = await Promise.all(
      teamIds.map((teamId) =>
        this.permittedModelsRepository.findManyLanguageByTeam(teamId, orgId),
      ),
    );

    const modelsByModelId = new Map<UUID, PermittedLanguageModel>();
    for (const teamModels of teamModelArrays) {
      for (const model of teamModels) {
        if (!modelsByModelId.has(model.model.id)) {
          modelsByModelId.set(model.model.id, model);
        }
      }
    }

    this.logger.debug('Merged team models', {
      teamIds,
      modelCount: modelsByModelId.size,
    });

    return Array.from(modelsByModelId.values());
  }
}
