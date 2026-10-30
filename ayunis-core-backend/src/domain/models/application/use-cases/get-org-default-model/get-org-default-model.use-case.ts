import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetOrgDefaultModelQuery } from './get-org-default-model.query';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';

@Injectable()
export class GetOrgDefaultModelUseCase {
  private readonly logger = new Logger(GetOrgDefaultModelUseCase.name);

  constructor(
    private readonly defaultModelSelectionsRepository: DefaultModelSelectionsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    query: GetOrgDefaultModelQuery,
  ): Promise<PermittedLanguageModel | null> {
    this.logger.log(
      {
        orgId: query.orgId,
      },
      'execute',
    );

    const selection = await this.defaultModelSelectionsRepository.find({
      orgId: query.orgId,
    });
    const orgDefaultModel =
      selection?.kind === 'model' && !selection.permittedModel.model.isArchived
        ? selection.permittedModel
        : null;

    if (orgDefaultModel) {
      this.logger.debug(
        {
          orgId: query.orgId,
          modelId: orgDefaultModel.id,
          modelName: orgDefaultModel.model.name,
          modelProvider: orgDefaultModel.model.provider,
        },
        'Organization default model found',
      );
    } else {
      this.logger.debug(
        {
          orgId: query.orgId,
        },
        'No organization default model found',
      );
    }

    return orgDefaultModel ?? null;
  }
}
