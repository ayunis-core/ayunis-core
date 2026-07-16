import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetDefaultModelQuery } from './get-default-model.query';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { GetEffectiveLanguageModelsUseCase } from '../get-effective-language-models/get-effective-language-models.use-case';
import { GetEffectiveLanguageModelsQuery } from '../get-effective-language-models/get-effective-language-models.query';
import {
  DefaultModelNotFoundError,
  UnexpectedModelError,
} from '../../models.errors';

@Injectable()
export class GetDefaultModelUseCase {
  private readonly logger = new Logger(GetDefaultModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
    private readonly getEffectiveLanguageModelsUseCase: GetEffectiveLanguageModelsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(query: GetDefaultModelQuery): Promise<PermittedLanguageModel> {
    this.logger.log('execute', { query });

    const { models: effectiveModels, overrideTeamIds } =
      await this.getEffectiveLanguageModelsUseCase.execute(
        new GetEffectiveLanguageModelsQuery(query.orgId, query.userId),
      );

    const effectiveModelIds = new Set(effectiveModels.map((m) => m.model.id));

    const isInEffectiveSet = (model: PermittedLanguageModel): boolean =>
      effectiveModelIds.has(model.model.id) &&
      !query.blacklistedModelIds?.includes(model.model.id);

    // Step 1: User default
    if (query.userId) {
      const userDefault = await this.resolveUserDefault(
        query.userId,
        isInEffectiveSet,
      );
      if (userDefault) {
        return userDefault;
      }
    }

    // Step 2: Team defaults (from override teams)
    if (query.userId && overrideTeamIds.length > 0) {
      const teamDefault = await this.resolveTeamDefault(
        overrideTeamIds,
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
    const orgDefault = await this.resolveOrgDefault(
      query.orgId,
      isInEffectiveSet,
    );
    if (orgDefault) {
      return orgDefault;
    }

    // Step 4: First available from effective set, alphabetically
    const firstAvailable = this.resolveFirstAvailable(
      effectiveModels,
      query.blacklistedModelIds,
    );
    if (firstAvailable) {
      return firstAvailable;
    }

    throw new DefaultModelNotFoundError(query.orgId);
  }

  private async resolveUserDefault(
    userId: UUID,
    isInEffectiveSet: (model: PermittedLanguageModel) => boolean,
  ): Promise<PermittedLanguageModel | null> {
    const userDefault =
      await this.userDefaultModelsRepository.findByUserId(userId);

    if (userDefault && isInEffectiveSet(userDefault)) {
      this.logger.debug('Using user default model', {
        userId,
        modelId: userDefault.id,
      });
      return userDefault;
    }

    return null;
  }

  private async resolveOrgDefault(
    orgId: UUID,
    isInEffectiveSet: (model: PermittedLanguageModel) => boolean,
  ): Promise<PermittedLanguageModel | null> {
    const orgDefault =
      await this.permittedModelsRepository.findOrgDefaultLanguage(orgId);

    if (orgDefault && isInEffectiveSet(orgDefault)) {
      this.logger.debug('Using org default model', {
        orgId,
        modelId: orgDefault.id,
      });
      return orgDefault;
    }

    return null;
  }

  private resolveFirstAvailable(
    effectiveModels: PermittedLanguageModel[],
    blacklistedModelIds?: UUID[],
  ): PermittedLanguageModel | null {
    const sorted = [...effectiveModels].sort((a, b) =>
      a.model.name.localeCompare(b.model.name),
    );

    for (const model of sorted) {
      if (!blacklistedModelIds?.includes(model.model.id)) {
        this.logger.debug('Using first available model alphabetically', {
          modelId: model.id,
        });
        return model;
      }
    }

    return null;
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
