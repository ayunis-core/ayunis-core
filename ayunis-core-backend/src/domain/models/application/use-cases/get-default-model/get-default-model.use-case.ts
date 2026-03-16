import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { GetDefaultModelQuery } from './get-default-model.query';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { TeamMembershipPort } from '../../ports/team-membership.port';
import { GetEffectiveLanguageModelsUseCase } from '../get-effective-language-models/get-effective-language-models.use-case';
import { GetEffectiveLanguageModelsQuery } from '../get-effective-language-models/get-effective-language-models.query';
import { DefaultModelNotFoundError, ModelError } from '../../models.errors';

@Injectable()
export class GetDefaultModelUseCase {
  private readonly logger = new Logger(GetDefaultModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
    private readonly teamMembershipPort: TeamMembershipPort,
    private readonly getEffectiveLanguageModelsUseCase: GetEffectiveLanguageModelsUseCase,
  ) {}

  async execute(query: GetDefaultModelQuery): Promise<PermittedLanguageModel> {
    this.logger.log('execute', { query });

    try {
      const effectiveModels =
        await this.getEffectiveLanguageModelsUseCase.execute(
          new GetEffectiveLanguageModelsQuery(query.orgId, query.userId),
        );

      const effectiveModelIds = new Set(effectiveModels.map((m) => m.model.id));

      const isInEffectiveSet = (model: PermittedLanguageModel): boolean =>
        effectiveModelIds.has(model.model.id) &&
        !query.blacklistedModelIds?.includes(model.id);

      // Step 1: User default
      if (query.userId) {
        const userDefault = await this.userDefaultModelsRepository.findByUserId(
          query.userId,
        );

        if (userDefault && isInEffectiveSet(userDefault)) {
          this.logger.debug('Using user default model', {
            userId: query.userId,
            modelId: userDefault.id,
          });
          return userDefault;
        }
      }

      // Step 2: Team defaults (from override teams)
      if (query.userId) {
        const teamDefault = await this.resolveTeamDefault(
          query.userId,
          query.orgId,
          effectiveModelIds,
          query.blacklistedModelIds,
        );
        if (teamDefault) {
          this.logger.debug('Using team default model', {
            modelId: teamDefault.id,
          });
          return teamDefault;
        }
      }

      // Step 3: Org default
      const orgDefault =
        await this.permittedModelsRepository.findOrgDefaultLanguage(
          query.orgId,
        );
      if (orgDefault && isInEffectiveSet(orgDefault)) {
        this.logger.debug('Using org default model', {
          orgId: query.orgId,
          modelId: orgDefault.id,
        });
        return orgDefault;
      }

      // Step 4: First available from effective set, alphabetically
      const sorted = [...effectiveModels].sort((a, b) =>
        a.model.name.localeCompare(b.model.name),
      );

      for (const model of sorted) {
        if (!query.blacklistedModelIds?.includes(model.id)) {
          this.logger.debug('Using first available model alphabetically', {
            modelId: model.id,
          });
          return model;
        }
      }

      throw new DefaultModelNotFoundError(query.orgId);
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }
      this.logger.error('Failed to get default model', {
        orgId: query.orgId,
        userId: query.userId,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw error;
    }
  }

  private async resolveTeamDefault(
    userId: UUID,
    orgId: UUID,
    effectiveModelIds: Set<UUID>,
    blacklistedModelIds?: UUID[],
  ): Promise<PermittedLanguageModel | null> {
    const teams = await this.teamMembershipPort.findTeamsByUserIdAndOrg(
      userId,
      orgId,
    );
    const overrideTeams = teams.filter((t) => t.modelOverrideEnabled);

    if (overrideTeams.length === 0) {
      return null;
    }

    const teamDefaults = await Promise.all(
      overrideTeams.map((team) =>
        this.permittedModelsRepository.findTeamDefaultLanguage(team.id, orgId),
      ),
    );

    const validDefaults = teamDefaults
      .filter(
        (model): model is PermittedLanguageModel =>
          model !== null &&
          effectiveModelIds.has(model.model.id) &&
          !blacklistedModelIds?.includes(model.id),
      )
      .sort((a, b) => a.model.name.localeCompare(b.model.name));

    return validDefaults[0] ?? null;
  }
}
