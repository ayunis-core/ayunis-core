import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';
import { DeleteUserDefaultModelCommand } from './delete-user-default-model.command';

@Injectable()
export class DeleteUserDefaultModelUseCase {
  private readonly logger = new Logger(DeleteUserDefaultModelUseCase.name);

  constructor(
    private readonly defaultModelSelectionsRepository: DefaultModelSelectionsRepository,
  ) {}

  /** Removes the personal default, whether it is a model or a mode. */
  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(command: DeleteUserDefaultModelCommand): Promise<void> {
    this.logger.log({ userId: command.userId }, 'execute');
    await this.defaultModelSelectionsRepository.clear({
      userId: command.userId,
    });
  }
}
