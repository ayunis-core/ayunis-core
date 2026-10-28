import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import {
  DefaultModelNotFoundError,
  OnlyAnonymousModelsAvailableError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { UserDefaultModelsRepository } from 'src/domain/models/application/ports/user-default-models.repository';
import { GetEffectiveLanguageModelsQuery } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.query';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { GetDefaultModelQuery } from './get-default-model.query';

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
    this.logger.log(
      {
        orgId: query.orgId,
        userId: query.userId,
        excludedPermittedModelIds: query.excludedPermittedModelIds,
      },
      'execute',
    );
    const { models, overrideTeamIds } =
      await this.getEffectiveLanguageModelsUseCase.execute(
        new GetEffectiveLanguageModelsQuery(
          query.orgId,
          query.userId,
          query.excludedPermittedModelIds,
        ),
      );
    const effectiveModels = this.indexEligibleModels(models, query);
    return this.resolveDefault(query, effectiveModels, overrideTeamIds);
  }

  private async resolveDefault(
    query: GetDefaultModelQuery,
    effectiveModels: Map<UUID, PermittedLanguageModel>,
    overrideTeamIds: UUID[],
  ): Promise<PermittedLanguageModel> {
    const orgDefault = query.preferOrganizationDefault
      ? await this.resolveOrgDefault(query.orgId, effectiveModels)
      : null;
    if (orgDefault) return orgDefault;

    const userDefault = await this.resolveUserDefault(
      query.userId,
      effectiveModels,
    );
    if (userDefault) return userDefault;

    const teamDefault = await this.resolveTeamDefault(
      overrideTeamIds,
      query.orgId,
      effectiveModels,
      query.excludedPermittedModelIds ?? [],
    );
    if (teamDefault) return teamDefault;

    if (!query.preferOrganizationDefault) {
      const fallback = await this.resolveOrgDefault(
        query.orgId,
        effectiveModels,
      );
      if (fallback) return fallback;
    }

    return [...effectiveModels.values()].sort((a, b) =>
      a.model.name.localeCompare(b.model.name),
    )[0];
  }

  private indexEligibleModels(
    models: PermittedLanguageModel[],
    query: GetDefaultModelQuery,
  ): Map<UUID, PermittedLanguageModel> {
    if (models.length === 0) throw new DefaultModelNotFoundError(query.orgId);
    const eligible = query.excludeAnonymousOnly
      ? models.filter((model) => !model.anonymousOnly)
      : models;
    if (eligible.length === 0) {
      throw new OnlyAnonymousModelsAvailableError(query.orgId);
    }
    return new Map(eligible.map((model) => [model.model.id, model]));
  }

  private async resolveUserDefault(
    userId: UUID | undefined,
    effectiveModels: Map<UUID, PermittedLanguageModel>,
  ): Promise<PermittedLanguageModel | null> {
    if (!userId) return null;
    const userDefault =
      await this.userDefaultModelsRepository.findByUserId(userId);
    return this.toEffectiveModel(userDefault, effectiveModels);
  }

  private async resolveTeamDefault(
    teamIds: UUID[],
    orgId: UUID,
    effectiveModels: Map<UUID, PermittedLanguageModel>,
    excludedIds: UUID[],
  ): Promise<PermittedLanguageModel | null> {
    if (teamIds.length === 0) return null;
    const defaults =
      await this.permittedModelsRepository.findManyTeamDefaultLanguage(
        teamIds,
        orgId,
      );
    const effectiveDefaults = defaults
      .filter((model) => !excludedIds.includes(model.id))
      .map((model) => this.toEffectiveModel(model, effectiveModels))
      .filter((model): model is PermittedLanguageModel => model !== null)
      .sort((a, b) => a.model.name.localeCompare(b.model.name));
    return effectiveDefaults[0] ?? null;
  }

  private async resolveOrgDefault(
    orgId: UUID,
    effectiveModels: Map<UUID, PermittedLanguageModel>,
  ): Promise<PermittedLanguageModel | null> {
    const orgDefault =
      await this.permittedModelsRepository.findOrgDefaultLanguage(orgId);
    return this.toEffectiveModel(orgDefault, effectiveModels);
  }

  private toEffectiveModel(
    preferredModel: PermittedLanguageModel | null,
    effectiveModels: Map<UUID, PermittedLanguageModel>,
  ): PermittedLanguageModel | null {
    if (!preferredModel) return null;
    return effectiveModels.get(preferredModel.model.id) ?? null;
  }
}
