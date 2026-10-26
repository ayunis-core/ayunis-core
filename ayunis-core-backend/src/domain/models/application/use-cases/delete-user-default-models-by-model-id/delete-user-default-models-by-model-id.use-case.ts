import { Injectable, Logger } from '@nestjs/common';
import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import { DeleteUserDefaultModelsByModelIdCommand } from './delete-user-default-models-by-model-id.command';

/** Removes every default (user, team or org) pointing at a permit being deleted. */
@Injectable()
export class DeleteUserDefaultModelsByModelIdUseCase {
  private readonly logger = new Logger(
    DeleteUserDefaultModelsByModelIdUseCase.name,
  );

  constructor(
    private readonly defaultModelSelectionsRepository: DefaultModelSelectionsRepository,
  ) {}

  async execute(
    command: DeleteUserDefaultModelsByModelIdCommand,
  ): Promise<void> {
    this.logger.debug(
      { modelId: command.permittedModelId },
      'Deleting defaults by permitted model id',
    );
    await this.defaultModelSelectionsRepository.deleteByPermittedModelIds([
      command.permittedModelId,
    ]);
  }
}
