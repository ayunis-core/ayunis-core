import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';
import { ModelModeEntriesRepository } from 'src/domain/models/application/ports/model-mode-entries.repository';
import { resolveModelMode } from 'src/domain/models/application/helpers/resolve-model-mode.helper';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { GetEffectiveLanguageModelsQuery } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.query';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import type { ModelModeResolution } from './model-mode-resolution';

@Injectable()
export class ResolveModelModesUseCase {
  private readonly logger = new Logger(ResolveModelModesUseCase.name);

  constructor(
    private readonly modelModeEntriesRepository: ModelModeEntriesRepository,
    private readonly getEffectiveLanguageModelsUseCase: GetEffectiveLanguageModelsUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(): Promise<ModelModeResolution[]> {
    const { userId, orgId } = getRequiredUserContext(this.contextService);
    this.logger.log({ userId, orgId }, 'Resolving model modes');

    const { models: permits } =
      await this.getEffectiveLanguageModelsUseCase.execute(
        new GetEffectiveLanguageModelsQuery(orgId, userId),
      );

    return Promise.all(
      Object.values(ModelMode).map(async (mode) => {
        const entries = await this.modelModeEntriesRepository.findByMode(mode);
        return {
          mode,
          permittedModel: resolveModelMode(mode, entries, permits, false),
          anonymousPermittedModel: resolveModelMode(
            mode,
            entries,
            permits,
            true,
          ),
        };
      }),
    );
  }
}
