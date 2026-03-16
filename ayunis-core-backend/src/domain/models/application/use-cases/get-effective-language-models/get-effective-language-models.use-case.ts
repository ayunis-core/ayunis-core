import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ContextService } from 'src/common/context/services/context.service';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UnexpectedModelError } from '../../models.errors';
import { ListMyTeamsUseCase } from 'src/iam/teams/application/use-cases/list-my-teams/list-my-teams.use-case';
import { GetEffectiveLanguageModelsQuery } from './get-effective-language-models.query';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@Injectable()
export class GetEffectiveLanguageModelsUseCase {
  private readonly logger = new Logger(GetEffectiveLanguageModelsUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly listMyTeamsUseCase: ListMyTeamsUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    query: GetEffectiveLanguageModelsQuery,
  ): Promise<PermittedLanguageModel[]> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError({ reason: 'Missing user context' });
    }

    this.logger.log('Resolving effective language models', {
      userId,
      orgId: query.orgId,
    });

    try {
      const orgId = this.contextService.get('orgId');
      const systemRole = this.contextService.get('systemRole');
      const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
      const isFromOrg = orgId === query.orgId;
      if (!isFromOrg && !isSuperAdmin) {
        throw new UnauthorizedAccessError();
      }

      const allTeams = await this.listMyTeamsUseCase.execute();
      const orgTeams = allTeams.filter((team) => team.orgId === query.orgId);
      const overrideTeams = orgTeams.filter(
        (team) => team.modelOverrideEnabled,
      );

      if (overrideTeams.length === 0) {
        this.logger.debug(
          'No override teams found, returning org-level models',
          {
            userId,
            orgId: query.orgId,
          },
        );
        return this.permittedModelsRepository.findManyLanguage(query.orgId);
      }

      const merged = await this.mergeTeamModels(
        overrideTeams.map((t) => t.id),
        query.orgId,
      );

      if (merged.length === 0) {
        this.logger.debug(
          'Override teams have no configured models, falling back to org-level models',
          { userId, orgId: query.orgId },
        );
        return this.permittedModelsRepository.findManyLanguage(query.orgId);
      }

      return merged;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error resolving effective language models', {
        userId,
        orgId: query.orgId,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw new UnexpectedModelError(error as Error);
    }
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
