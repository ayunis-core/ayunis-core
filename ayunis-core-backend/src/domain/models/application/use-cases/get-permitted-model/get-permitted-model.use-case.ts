import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import {
  ModelInvalidInputError,
  PermittedModelNotFoundError,
  UnexpectedModelError,
} from '../../models.errors';
import { GetPermittedModelQuery } from './get-permitted-model.query';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class GetPermittedModelUseCase {
  private readonly logger = new Logger(GetPermittedModelUseCase.name);
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  async execute(query: GetPermittedModelQuery): Promise<PermittedModel> {
    try {
      this.logger.log('execute', {
        query,
      });
      this.logger.debug('GetPermittedModelByIdQuery', {
        query,
      });
      const model = await this.permittedModelsRepository.findOne({
        id: query.permittedModelId,
        orgId: query.orgId,
      });
      if (!model) {
        this.logger.error('Permitted model not found', {
          query,
        });
        throw new PermittedModelNotFoundError(query.permittedModelId);
      }
      return model;
    } catch (error) {
      if (error instanceof PermittedModelNotFoundError) {
        throw error;
      }
      this.logger.error('Error getting permitted model', {
        error,
      });
      throw new UnexpectedModelError(error, {
        query,
      });
    }
  }
}
