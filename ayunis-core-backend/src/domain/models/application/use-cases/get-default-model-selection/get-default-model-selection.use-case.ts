import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';
import {
  DefaultModelSelection,
  DefaultModelSelectionService,
} from 'src/domain/models/application/services/default-model-selection.service';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';

/** What the composer preselects for a new chat: a mode or a concrete model. */
@Injectable()
export class GetDefaultModelSelectionUseCase {
  private readonly logger = new Logger(GetDefaultModelSelectionUseCase.name);

  constructor(
    private readonly defaultModelSelectionService: DefaultModelSelectionService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(): Promise<DefaultModelSelection> {
    const { userId, orgId } = getRequiredUserContext(this.contextService);
    this.logger.log({ userId, orgId }, 'Getting default model selection');
    return this.defaultModelSelectionService.select(
      new GetDefaultModelQuery({ orgId, userId }),
    );
  }
}
