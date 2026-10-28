import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';
import { UnexpectedUsageError } from 'src/domain/usage/application/usage.errors';
import { HasUsageForModelQuery } from './has-usage-for-model.query';

@Injectable()
export class HasUsageForModelUseCase {
  private readonly logger = new Logger(HasUsageForModelUseCase.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(query: HasUsageForModelQuery): Promise<boolean> {
    this.logger.log(
      {
        modelId: query.modelId,
      },
      'Checking usage references for model',
    );

    return await this.usageRepository.existsByModelId(query.modelId);
  }
}
