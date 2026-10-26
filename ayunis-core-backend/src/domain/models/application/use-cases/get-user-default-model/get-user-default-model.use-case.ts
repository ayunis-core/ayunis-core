import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetUserDefaultModelQuery } from './get-user-default-model.query';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';

@Injectable()
export class GetUserDefaultModelUseCase {
  private readonly logger = new Logger(GetUserDefaultModelUseCase.name);

  constructor(
    private readonly defaultModelSelectionsRepository: DefaultModelSelectionsRepository,
  ) {}

  /** The personal default model; null when none is set or the default is a mode. */
  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    query: GetUserDefaultModelQuery,
  ): Promise<PermittedLanguageModel | null> {
    this.logger.log({ userId: query.userId }, 'execute');
    const selection = await this.defaultModelSelectionsRepository.find({
      userId: query.userId,
    });
    return selection?.kind === 'model' ? selection.permittedModel : null;
  }
}
