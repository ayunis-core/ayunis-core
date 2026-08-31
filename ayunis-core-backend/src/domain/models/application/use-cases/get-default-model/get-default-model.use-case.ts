import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import {
  DefaultModelNotFoundError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { UserDefaultModelsRepository } from 'src/domain/models/application/ports/user-default-models.repository';
import { GetEffectiveLanguageModelsQuery } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.query';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { GetDefaultModelQuery } from './get-default-model.query';

@Injectable()
export class GetDefaultModelUseCase {
  constructor(
    @InjectPinoLogger(GetDefaultModelUseCase.name)
    private readonly logger: PinoLogger,

    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
    private readonly getEffectiveLanguageModelsUseCase: GetEffectiveLanguageModelsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(query: GetDefaultModelQuery): Promise<PermittedLanguageModel> {
    this.logger.info(
      {
        orgId: query.orgId,
        userId: query.userId,
        blacklistedModelIds: query.blacklistedModelIds,
      },
      'execute',
    );
    const { models, overrideTeamIds } =
      await this.getEffectiveLanguageModelsUseCase.execute(
        new GetEffectiveLanguageModelsQuery(query.orgId, query.userId),
      );
    const effectiveModels = this.indexEffectiveModels(
      models,
      query.blacklistedModelIds,
    );
    if (effectiveModels.size === 0) {
      throw new DefaultModelNotFoundError(query.orgId);
    }

    const userDefault = await this.resolveUserDefault(
      query.userId,
      effectiveModels,
    );
    if (userDefault) return userDefault;

    const teamDefault = await this.resolveTeamDefault(
      overrideTeamIds,
      query.orgId,
      effectiveModels,
    );
    if (teamDefault) return teamDefault;

    const orgDefault = await this.resolveOrgDefault(
      query.orgId,
      effectiveModels,
    );
    if (orgDefault) return orgDefault;

    return [...effectiveModels.values()].sort((a, b) =>
      a.model.name.localeCompare(b.model.name),
    )[0];
  }

  private indexEffectiveModels(
    models: PermittedLanguageModel[],
    blacklistedModelIds?: UUID[],
  ): Map<UUID, PermittedLanguageModel> {
    return new Map(
      models
        .filter((model) => !blacklistedModelIds?.includes(model.model.id))
        .map((model) => [model.model.id, model]),
    );
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
  ): Promise<PermittedLanguageModel | null> {
    if (teamIds.length === 0) return null;
    const defaults =
      await this.permittedModelsRepository.findManyTeamDefaultLanguage(
        teamIds,
        orgId,
      );
    const effectiveDefaults = defaults
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
