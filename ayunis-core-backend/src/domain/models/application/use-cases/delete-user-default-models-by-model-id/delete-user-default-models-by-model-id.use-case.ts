import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { DeleteUserDefaultModelsByModelIdCommand } from './delete-user-default-models-by-model-id.command';
import { UnexpectedModelError } from '../../models.errors';

@Injectable()
export class DeleteUserDefaultModelsByModelIdUseCase {
  private readonly logger = new Logger(
    DeleteUserDefaultModelsByModelIdUseCase.name,
  );

  constructor(
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
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
