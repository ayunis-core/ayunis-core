import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Model } from 'src/domain/models/domain/model.entity';
import { ModelsRepository } from 'src/domain/models/application/ports/models.repository';
import { GetModelQuery } from './get-model.query';
import {
  ModelNotFoundByNameAndProviderError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';

@Injectable()
export class GetModelUseCase {
  private readonly logger = new Logger(GetModelUseCase.name);

  constructor(private readonly modelsRepository: ModelsRepository) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(query: GetModelQuery): Promise<Model> {
    this.logger.log(query, 'execute');

    const model = await this.modelsRepository.findOne(query);
    if (!model) {
      throw new ModelNotFoundByNameAndProviderError(query.name, query.provider);
    }

    return model;
  }
}
