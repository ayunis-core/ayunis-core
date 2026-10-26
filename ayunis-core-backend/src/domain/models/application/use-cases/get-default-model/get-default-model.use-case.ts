import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';
import { DefaultModelSelectionService } from 'src/domain/models/application/services/default-model-selection.service';
import { GetDefaultModelQuery } from './get-default-model.query';

@Injectable()
export class GetDefaultModelUseCase {
  private readonly logger = new Logger(GetDefaultModelUseCase.name);

  constructor(
    private readonly defaultModelSelectionService: DefaultModelSelectionService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(query: GetDefaultModelQuery): Promise<PermittedLanguageModel> {
    this.logger.log(
      {
        orgId: query.orgId,
        userId: query.userId,
        excludedPermittedModelIds: query.excludedPermittedModelIds,
      },
      'execute',
    );
    const selection = await this.defaultModelSelectionService.select(query);
    return selection.permittedModel;
  }
}
