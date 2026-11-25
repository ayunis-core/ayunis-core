import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { OnlyAnonymousModelsAvailableError } from 'src/domain/models/application/models.errors';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { GetPermittedLanguageModelQuery } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.query';
import { ResolveModelModesUseCase } from 'src/domain/models/application/use-cases/resolve-model-modes/resolve-model-modes.use-case';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import {
  RoutineConflictingModelSelectionError,
  RoutineModelModeUnavailableError,
  RoutinePromptImprovementUnavailableError,
} from 'src/domain/routines/application/routines.errors';
import type { Routine } from 'src/domain/routines/domain/routine.entity';

export interface RoutineModelChoice {
  modelId: UUID | null;
  mode: ModelMode | null;
}

/** Which permitted model a routine uses, checked against the current user's grants. */
@Injectable()
export class RoutineModelService {
  constructor(
    private readonly getPermittedLanguageModelUseCase: GetPermittedLanguageModelUseCase,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
    private readonly resolveModelModesUseCase: ResolveModelModesUseCase,
    private readonly contextService: ContextService,
  ) {}

  /**
   * The model choice to store for a routine. A mode and the user's default
   * (neither a model nor a mode) are stored as such, so runs follow later
   * changes of the mode's list or the default; they are still resolved here
   * so a user without a usable model is told now.
   */
  async select(choice: {
    modelId?: UUID | null;
    mode?: ModelMode | null;
  }): Promise<RoutineModelChoice> {
    const { modelId, mode } = choice;
    if (modelId && mode) throw new RoutineConflictingModelSelectionError();
    if (mode) {
      await this.assertModeAvailable(mode);
      return { modelId: null, mode };
    }
    if (!modelId) {
      await this.userDefault();
      return { modelId: null, mode: null };
    }
    const model = await this.getPermittedLanguageModelUseCase.execute(
      new GetPermittedLanguageModelQuery({ id: modelId }),
    );
    return { modelId: model.id, mode: null };
  }

  /** Access is re-checked, and a mode resolved, when the run's thread is created. */
  async forRun(
    routine: Routine,
  ): Promise<{ modelId: UUID } | { mode: ModelMode }> {
    if (routine.mode) return { mode: routine.mode };
    return { modelId: routine.modelId ?? (await this.userDefault()) };
  }

  /**
   * The model that rewrites a routine's task: the organization default first,
   * like the skill text improver, and never an anonymous-only model, since
   * anonymized placeholders must not become part of the stored task.
   */
  async forPromptImprovement(): Promise<LanguageModel> {
    const { userId, orgId } = getRequiredUserContext(this.contextService);
    try {
      const { model } = await this.getDefaultModelUseCase.execute(
        new GetDefaultModelQuery({
          orgId,
          userId,
          preferOrganizationDefault: true,
          excludeAnonymousOnly: true,
        }),
      );
      return model;
    } catch (error) {
      // Having no model at all is the same situation as in chat, so
      // NO_DEFAULT_MODEL_FOUND passes through unchanged.
      if (error instanceof OnlyAnonymousModelsAvailableError) {
        throw new RoutinePromptImprovementUnavailableError({ orgId });
      }
      throw error;
    }
  }

  /** The same resolution a new chat in the mode binds. */
  private async assertModeAvailable(mode: ModelMode): Promise<void> {
    const resolution = (await this.resolveModelModesUseCase.execute()).find(
      (r) => r.mode === mode,
    );
    if (!resolution?.permittedModel && !resolution?.anonymousPermittedModel) {
      throw new RoutineModelModeUnavailableError(mode);
    }
  }

  private async userDefault(): Promise<UUID> {
    const { userId, orgId } = getRequiredUserContext(this.contextService);
    const model = await this.getDefaultModelUseCase.execute(
      new GetDefaultModelQuery({ orgId, userId }),
    );
    return model.id;
  }
}
