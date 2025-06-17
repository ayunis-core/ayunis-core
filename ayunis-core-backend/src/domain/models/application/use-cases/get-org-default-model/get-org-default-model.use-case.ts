import { Injectable, Logger } from '@nestjs/common';
import { GetOrgDefaultModelQuery } from './get-org-default-model.query';
import { PermittedModel } from '../../../domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { ModelError } from '../../models.errors';

@Injectable()
export class GetOrgDefaultModelUseCase {
  private readonly logger = new Logger(GetOrgDefaultModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  async execute(
    query: GetOrgDefaultModelQuery,
  ): Promise<PermittedModel | null> {
    this.logger.log('execute', {
      orgId: query.orgId,
    });

    try {
      // Get only the organization's specific default model
      const orgDefaultModel = await this.permittedModelsRepository.findDefault(
        query.orgId,
      );

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

      return orgDefaultModel || null;
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }
      this.logger.error('Failed to get organization default model', {
        orgId: query.orgId,
        error,
      });
      throw error;
    }
  }
}
