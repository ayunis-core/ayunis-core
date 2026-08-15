import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Model } from 'src/domain/models/domain/model.entity';
import { ModelsRepository } from '../../ports/models.repository';
import { GetModelQuery } from './get-model.query';
import {
  ModelNotFoundByNameAndProviderError,
  UnexpectedModelError,
} from '../../models.errors';

@Injectable()
export class GetModelUseCase {
  constructor(
    @InjectPinoLogger(GetModelUseCase.name)
    private readonly logger: PinoLogger,
    private readonly modelsRepository: ModelsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(query: GetModelQuery): Promise<Model> {
    this.logger.info(query, 'execute');

    const model = await this.modelsRepository.findOne(query);
    if (!model) {
      throw new ModelNotFoundByNameAndProviderError(query.name, query.provider);
    }

    return model;
  }
}
