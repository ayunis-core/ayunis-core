import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';
import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import { ModelModeDefaultScopeService } from 'src/domain/models/application/services/model-mode-default-scope.service';
import { SetModelModeDefaultCommand } from './set-model-mode-default.command';

@Injectable()
export class SetModelModeDefaultUseCase {
  private readonly logger = new Logger(SetModelModeDefaultUseCase.name);

  constructor(
    private readonly scopeService: ModelModeDefaultScopeService,
    private readonly defaultModelSelectionsRepository: DefaultModelSelectionsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(command: SetModelModeDefaultCommand): Promise<void> {
    this.logger.log(
      { level: command.level, teamId: command.teamId, mode: command.mode },
      'Setting model mode default',
    );
    const { target } = await this.scopeService.resolve(
      command.level,
      command.teamId,
    );
    // A mode replaces the level's model default; clearing removes either.
    if (command.mode) {
      await this.defaultModelSelectionsRepository.setMode(target, command.mode);
    } else {
      await this.defaultModelSelectionsRepository.clear(target);
    }
  }
}
