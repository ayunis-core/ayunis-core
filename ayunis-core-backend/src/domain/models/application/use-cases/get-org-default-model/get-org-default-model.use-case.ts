import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetOrgDefaultModelQuery } from './get-org-default-model.query';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UnexpectedModelError } from '../../models.errors';

@Injectable()
export class GetOrgDefaultModelUseCase {
  constructor(
    @InjectPinoLogger(GetOrgDefaultModelUseCase.name)
    private readonly logger: PinoLogger,

    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    query: GetOrgDefaultModelQuery,
  ): Promise<PermittedLanguageModel | null> {
    this.logger.info(
      {
        orgId: query.orgId,
      },
      'execute',
    );

    // Get only the organization's specific default model
    const orgDefaultModel =
      await this.permittedModelsRepository.findOrgDefaultLanguage(query.orgId);

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
