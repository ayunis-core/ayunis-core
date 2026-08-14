import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Model } from 'src/domain/models/domain/model.entity';
import { ModelsRepository } from '../../ports/models.repository';
import { GetModelByIdQuery } from './get-model-by-id.query';
import {
  ModelNotFoundByIdError,
  UnexpectedModelError,
} from '../../models.errors';

@Injectable()
export class GetModelByIdUseCase {
  constructor(
    @InjectPinoLogger(GetModelByIdUseCase.name)
    private readonly logger: PinoLogger,
    private readonly modelsRepository: ModelsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(query: GetModelByIdQuery): Promise<Model> {
    this.logger.info({ id: query.id }, 'execute');

    const model = await this.modelsRepository.findOne({ id: query.id });
    if (!model) {
      throw new ModelNotFoundByIdError(query.id);
    }

    return model;
  }
}
