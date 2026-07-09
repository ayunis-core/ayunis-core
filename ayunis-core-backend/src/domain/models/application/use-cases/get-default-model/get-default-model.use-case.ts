import { Injectable } from '@nestjs/common';
import { BaseUseCase } from 'src/common/use-case/base-use-case';
import type { UUID } from 'crypto';
import { GetDefaultModelQuery } from './get-default-model.query';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { GetEffectiveLanguageModelsUseCase } from '../get-effective-language-models/get-effective-language-models.use-case';
import { GetEffectiveLanguageModelsQuery } from '../get-effective-language-models/get-effective-language-models.query';
import { DefaultModelNotFoundError, ModelError } from '../../models.errors';

@Injectable()
export class GetDefaultModelUseCase extends BaseUseCase {
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
    private readonly getEffectiveLanguageModelsUseCase: GetEffectiveLanguageModelsUseCase,
  ) {
    super();
  }

  async execute(query: GetDefaultModelQuery): Promise<PermittedLanguageModel> {
    this.logger.log('execute', { query });

    try {
      const { models: effectiveModels, overrideTeamIds } =
        await this.getEffectiveLanguageModelsUseCase.execute(
          new GetEffectiveLanguageModelsQuery(query.orgId, query.userId),
        );

      const effectiveModelIds = new Set(effectiveModels.map((m) => m.model.id));

      const isInEffectiveSet = (model: PermittedLanguageModel): boolean =>
        effectiveModelIds.has(model.model.id) &&
        !query.blacklistedModelIds?.includes(model.model.id);

      return await this.resolveDefaultModel(
        query,
        overrideTeamIds,
        effectiveModels,
        effectiveModelIds,
        isInEffectiveSet,
      );
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

  private async resolveDefaultModel(
    query: GetDefaultModelQuery,
    overrideTeamIds: UUID[],
    effectiveModels: PermittedLanguageModel[],
    effectiveModelIds: Set<UUID>,
    isInEffectiveSet: (model: PermittedLanguageModel) => boolean,
  ): Promise<PermittedLanguageModel> {
    const userDefault = await this.findUserDefault(query, isInEffectiveSet);
    if (userDefault) {
      return userDefault;
    }

    const teamDefault = await this.findTeamDefault(
      query,
      overrideTeamIds,
      effectiveModelIds,
    );
    if (teamDefault) {
      return teamDefault;
    }

    const orgDefault = await this.findOrgDefault(query.orgId, isInEffectiveSet);
    if (orgDefault) {
      return orgDefault;
    }

    return this.findFirstAvailableModel(query, effectiveModels);
  }

  private async findUserDefault(
    query: GetDefaultModelQuery,
    isInEffectiveSet: (model: PermittedLanguageModel) => boolean,
  ): Promise<PermittedLanguageModel | null> {
    if (!query.userId) {
      return null;
    }

    const userDefault = await this.userDefaultModelsRepository.findByUserId(
      query.userId,
    );
    if (!userDefault || !isInEffectiveSet(userDefault)) {
      return null;
    }

    this.logger.debug('Using user default model', {
      userId: query.userId,
      modelId: userDefault.id,
    });
    return userDefault;
  }

  private async findTeamDefault(
    query: GetDefaultModelQuery,
    overrideTeamIds: UUID[],
    effectiveModelIds: Set<UUID>,
  ): Promise<PermittedLanguageModel | null> {
    if (!query.userId || overrideTeamIds.length === 0) {
      return null;
    }

    const teamDefault = await this.resolveTeamDefault(
      overrideTeamIds,
      query.orgId,
      effectiveModelIds,
      query.blacklistedModelIds,
    );
    if (!teamDefault) {
      return null;
    }

    this.logger.debug('Using team default model', {
      modelId: teamDefault.id,
    });
    return teamDefault;
  }

  private async findOrgDefault(
    orgId: UUID,
    isInEffectiveSet: (model: PermittedLanguageModel) => boolean,
  ): Promise<PermittedLanguageModel | null> {
    const orgDefault =
      await this.permittedModelsRepository.findOrgDefaultLanguage(orgId);
    if (!orgDefault || !isInEffectiveSet(orgDefault)) {
      return null;
    }

    this.logger.debug('Using org default model', {
      orgId,
      modelId: orgDefault.id,
    });
    return orgDefault;
  }

  private findFirstAvailableModel(
    query: GetDefaultModelQuery,
    effectiveModels: PermittedLanguageModel[],
  ): PermittedLanguageModel {
    const model = [...effectiveModels]
      .sort((a, b) => a.model.name.localeCompare(b.model.name))
      .find(
        (candidate) => !query.blacklistedModelIds?.includes(candidate.model.id),
      );

    if (!model) {
      throw new DefaultModelNotFoundError(query.orgId);
    }

    this.logger.debug('Using first available model alphabetically', {
      modelId: model.id,
    });
    return model;
  }

  private async resolveTeamDefault(
    overrideTeamIds: UUID[],
    orgId: UUID,
    effectiveModelIds: Set<UUID>,
    blacklistedModelIds?: UUID[],
  ): Promise<PermittedLanguageModel | null> {
    const teamDefaults = await Promise.all(
      overrideTeamIds.map((teamId) =>
        this.permittedModelsRepository.findTeamDefaultLanguage(teamId, orgId),
      ),
    );

    const validDefaults = teamDefaults
      .filter(
        (model): model is PermittedLanguageModel =>
          model !== null &&
          effectiveModelIds.has(model.model.id) &&
          !blacklistedModelIds?.includes(model.model.id),
      )
      .sort((a, b) => a.model.name.localeCompare(b.model.name));

    return validDefaults[0] ?? null;
  }
}
