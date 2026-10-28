import { Injectable, Logger } from '@nestjs/common';
import { UserDefaultModelsRepository } from 'src/domain/models/application/ports/user-default-models.repository';
import { DeleteUserDefaultModelsByModelIdCommand } from './delete-user-default-models-by-model-id.command';

@Injectable()
export class DeleteUserDefaultModelsByModelIdUseCase {
  private readonly logger = new Logger(
    DeleteUserDefaultModelsByModelIdUseCase.name,
  );

  constructor(
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
  ) {}

  async execute(
    command: DeleteUserDefaultModelsByModelIdCommand,
  ): Promise<void> {
    this.logger.debug(
      {
        modelId: command.permittedModelId,
      },
      'Deleting user default models by model id',
    );
    await this.userDefaultModelsRepository.deleteByModelId(
      command.permittedModelId,
    );
  }
}
