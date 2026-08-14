import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UsageRepository } from '../../ports/usage.repository';
import { UnexpectedUsageError } from '../../usage.errors';
import { HasUsageForModelQuery } from './has-usage-for-model.query';

@Injectable()
export class HasUsageForModelUseCase {
  constructor(
    private readonly usageRepository: UsageRepository,
    @InjectPinoLogger(HasUsageForModelUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(query: HasUsageForModelQuery): Promise<boolean> {
    this.logger.info(
      {
        modelId: query.modelId,
      },
      'Checking usage references for model',
    );

    return await this.usageRepository.existsByModelId(query.modelId);
  }
}
