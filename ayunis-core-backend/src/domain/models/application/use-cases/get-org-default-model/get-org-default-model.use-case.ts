import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetOrgDefaultModelQuery } from './get-org-default-model.query';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UnexpectedModelError } from '../../models.errors';

@Injectable()
export class GetOrgDefaultModelUseCase {
  private readonly logger = new Logger(GetOrgDefaultModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    query: GetOrgDefaultModelQuery,
  ): Promise<PermittedLanguageModel | null> {
    this.logger.log('execute', {
      orgId: query.orgId,
    });

    // Get only the organization's specific default model
    const orgDefaultModel =
      await this.permittedModelsRepository.findOrgDefaultLanguage(query.orgId);

    if (orgDefaultModel) {
      this.logger.debug('Organization default model found', {
        orgId: query.orgId,
        modelId: orgDefaultModel.id,
        modelName: orgDefaultModel.model.name,
        modelProvider: orgDefaultModel.model.provider,
      });
    } else {
      this.logger.debug('No organization default model found', {
        orgId: query.orgId,
      });
    }

    return orgDefaultModel ?? null;
  }
}
