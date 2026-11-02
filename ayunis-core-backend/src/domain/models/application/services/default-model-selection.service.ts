import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import type { DefaultModelSelection as StoredSelection } from 'src/domain/models/domain/default-model-selection';
import {
  DefaultModelNotFoundError,
  OnlyAnonymousModelsAvailableError,
} from 'src/domain/models/application/models.errors';
import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import { ModelModeEntriesRepository } from 'src/domain/models/application/ports/model-mode-entries.repository';
import { resolveModelMode } from 'src/domain/models/application/helpers/resolve-model-mode.helper';
import { GetEffectiveLanguageModelsQuery } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.query';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';

export interface DefaultModelSelection {
  permittedModel: PermittedLanguageModel;
  /** Set when the default came from a mode rather than a concrete model. */
  mode: ModelMode | null;
}

type Effective = Map<UUID, PermittedLanguageModel>;
type Level = () => Promise<DefaultModelSelection | null>;

/**
 * Default chain user → team → org → Auto → alphabetical. Each level holds at
 * most one default (a model or a mode); one that cannot be used right now
 * falls through to the next level.
 */
@Injectable()
export class DefaultModelSelectionService {
  constructor(
    private readonly getEffectiveLanguageModelsUseCase: GetEffectiveLanguageModelsUseCase,
    private readonly defaultModelSelectionsRepository: DefaultModelSelectionsRepository,
    private readonly modelModeEntriesRepository: ModelModeEntriesRepository,
  ) {}

  async select(query: GetDefaultModelQuery): Promise<DefaultModelSelection> {
    const { models, overrideTeamIds } =
      await this.getEffectiveLanguageModelsUseCase.execute(
        new GetEffectiveLanguageModelsQuery(
          query.orgId,
          query.userId,
          query.excludedPermittedModelIds,
        ),
      );
    const effective = this.indexEligibleModels(models, query);

    const org: Level = async () =>
      this.fromStored(
        await this.defaultModelSelectionsRepository.find({
          orgId: query.orgId,
        }),
        effective,
      );
    const levels: Level[] = [
      ...(query.preferOrganizationDefault ? [org] : []),
      () => this.userLevel(query.userId, effective),
      () => this.teamLevel(overrideTeamIds, query, effective),
      ...(query.preferOrganizationDefault ? [] : [org]),
      () => this.fromMode(ModelMode.AUTO, effective),
    ];
    for (const level of levels) {
      const selection = await level();
      if (selection) return selection;
    }
    return { permittedModel: this.alphabeticalFirst(effective), mode: null };
  }

  private indexEligibleModels(
    models: PermittedLanguageModel[],
    query: GetDefaultModelQuery,
  ): Effective {
    if (models.length === 0) throw new DefaultModelNotFoundError(query.orgId);
    const eligible = query.excludeAnonymousOnly
      ? models.filter((model) => !model.anonymousOnly)
      : models;
    if (eligible.length === 0) {
      throw new OnlyAnonymousModelsAvailableError(query.orgId);
    }
    return new Map(eligible.map((model) => [model.model.id, model]));
  }

  private async userLevel(
    userId: UUID | undefined,
    effective: Effective,
  ): Promise<DefaultModelSelection | null> {
    if (!userId) return null;
    return this.fromStored(
      await this.defaultModelSelectionsRepository.find({ userId }),
      effective,
    );
  }

  private async teamLevel(
    teamIds: UUID[],
    query: GetDefaultModelQuery,
    effective: Effective,
  ): Promise<DefaultModelSelection | null> {
    if (teamIds.length === 0) return null;
    const stored =
      await this.defaultModelSelectionsRepository.findForTeams(teamIds);
    // Deterministic across several override teams: modes (Auto before Max),
    // then team models by name.
    for (const mode of Object.values(ModelMode)) {
      if (!stored.some((s) => s.kind === 'mode' && s.mode === mode)) continue;
      const selection = await this.fromMode(mode, effective);
      if (selection) return selection;
    }
    const excludedIds = query.excludedPermittedModelIds ?? [];
    const teamModel = stored
      .flatMap((s) => (s.kind === 'model' ? [s.permittedModel] : []))
      .filter((model) => !excludedIds.includes(model.id))
      .map((model) => effective.get(model.model.id))
      .filter((model): model is PermittedLanguageModel => model !== undefined)
      .sort((a, b) => a.model.name.localeCompare(b.model.name))
      .at(0);
    return teamModel ? { permittedModel: teamModel, mode: null } : null;
  }

  private async fromStored(
    stored: StoredSelection | null,
    effective: Effective,
  ): Promise<DefaultModelSelection | null> {
    if (!stored) return null;
    if (stored.kind === 'mode') return this.fromMode(stored.mode, effective);
    const permittedModel = effective.get(stored.permittedModel.model.id);
    return permittedModel ? { permittedModel, mode: null } : null;
  }

  private async fromMode(
    mode: ModelMode,
    effective: Effective,
  ): Promise<DefaultModelSelection | null> {
    const entries = await this.modelModeEntriesRepository.findByMode(mode);
    const permittedModel = resolveModelMode(
      mode,
      entries,
      [...effective.values()],
      false,
    );
    return permittedModel ? { permittedModel, mode } : null;
  }

  private alphabeticalFirst(effective: Effective): PermittedLanguageModel {
    return [...effective.values()].sort((a, b) =>
      a.model.name.localeCompare(b.model.name),
    )[0];
  }
}
