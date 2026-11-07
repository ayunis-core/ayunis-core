import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { GetPermittedLanguageModelQuery } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.query';
import type { Routine } from 'src/domain/routines/domain/routine.entity';

/** Which permitted model a routine uses, checked against the current user's grants. */
@Injectable()
export class RoutineModelService {
  constructor(
    private readonly getPermittedLanguageModelUseCase: GetPermittedLanguageModelUseCase,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
    private readonly contextService: ContextService,
  ) {}

  /** The model to store for a routine; omitted means the user's default. */
  async select(modelId: UUID | undefined): Promise<UUID> {
    if (!modelId) return this.userDefault();
    const model = await this.getPermittedLanguageModelUseCase.execute(
      new GetPermittedLanguageModelQuery({ id: modelId }),
    );
    return model.id;
  }

  /** Access is re-checked when the run's thread is created. */
  async forRun(routine: Routine): Promise<UUID> {
    return routine.modelId ?? this.userDefault();
  }

  private async userDefault(): Promise<UUID> {
    const { userId, orgId } = getRequiredUserContext(this.contextService);
    const model = await this.getDefaultModelUseCase.execute(
      new GetDefaultModelQuery({ orgId, userId }),
    );
    return model.id;
  }
}
