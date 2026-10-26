import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';
import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import { ModelModeEntriesRepository } from 'src/domain/models/application/ports/model-mode-entries.repository';
import { ModelModeDefaultScopeService } from 'src/domain/models/application/services/model-mode-default-scope.service';
import { resolveModelMode } from 'src/domain/models/application/helpers/resolve-model-mode.helper';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { GetModelModeDefaultQuery } from './get-model-mode-default.query';

export interface ModelModeDefault {
  mode: ModelMode | null;
  /** Healthy, non-anonymous-only model the mode currently resolves to. */
  currentPermittedModel: PermittedLanguageModel | null;
  /** Modes a new chat on this level could currently resolve to a model. */
  availableModes: ModelMode[];
}

@Injectable()
export class GetModelModeDefaultUseCase {
  private readonly logger = new Logger(GetModelModeDefaultUseCase.name);

  constructor(
    private readonly scopeService: ModelModeDefaultScopeService,
    private readonly defaultModelSelectionsRepository: DefaultModelSelectionsRepository,
    private readonly modelModeEntriesRepository: ModelModeEntriesRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(query: GetModelModeDefaultQuery): Promise<ModelModeDefault> {
    this.logger.log(
      { level: query.level, teamId: query.teamId },
      'Getting model mode default',
    );
    const scope = await this.scopeService.resolve(query.level, query.teamId);
    const modes = Object.values(ModelMode);
    const [selection, grants, entriesByMode] = await Promise.all([
      this.defaultModelSelectionsRepository.find(scope.target),
      scope.grants(),
      Promise.all(
        modes.map((m) => this.modelModeEntriesRepository.findByMode(m)),
      ),
    ]);
    const entriesOf = (m: ModelMode) => entriesByMode[modes.indexOf(m)];
    const mode = selection?.kind === 'mode' ? selection.mode : null;

    return {
      mode,
      currentPermittedModel: mode
        ? resolveModelMode(mode, entriesOf(mode), grants, false, {
            allowFaultedFallback: false,
          })
        : null,
      availableModes: modes.filter(
        (m) => resolveModelMode(m, entriesOf(m), grants, false) !== null,
      ),
    };
  }
}
