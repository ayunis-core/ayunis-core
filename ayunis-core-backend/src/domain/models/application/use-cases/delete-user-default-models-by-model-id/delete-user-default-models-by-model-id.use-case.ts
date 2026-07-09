import { Injectable } from '@nestjs/common';
import { BaseUseCase } from 'src/common/use-case/base-use-case';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { DeleteUserDefaultModelsByModelIdCommand } from './delete-user-default-models-by-model-id.command';

@Injectable()
export class DeleteUserDefaultModelsByModelIdUseCase extends BaseUseCase {
  constructor(
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
  ) {
    super();
  }

  async execute(
    command: DeleteUserDefaultModelsByModelIdCommand,
  ): Promise<void> {
    this.logger.debug('Deleting user default models by model id', {
      modelId: command.permittedModelId,
    });
    await this.userDefaultModelsRepository.deleteByModelId(
      command.permittedModelId,
    );
  }
}
