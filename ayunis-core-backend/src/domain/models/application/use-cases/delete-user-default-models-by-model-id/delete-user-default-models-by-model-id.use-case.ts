import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { DeleteUserDefaultModelsByModelIdCommand } from './delete-user-default-models-by-model-id.command';

@Injectable()
export class DeleteUserDefaultModelsByModelIdUseCase {
  constructor(
    @InjectPinoLogger(DeleteUserDefaultModelsByModelIdUseCase.name)
    private readonly logger: PinoLogger,

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
