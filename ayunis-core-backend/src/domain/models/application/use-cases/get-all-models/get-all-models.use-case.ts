import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ModelsRepository } from '../../ports/models.repository';
import { Model } from 'src/domain/models/domain/model.entity';
import { UnexpectedModelError } from '../../models.errors';

@Injectable()
export class GetAllModelsUseCase {
  constructor(
    @InjectPinoLogger(GetAllModelsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly modelsRepository: ModelsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(): Promise<Model[]> {
    this.logger.info('execute');

    return this.modelsRepository.findAll();
  }
}
