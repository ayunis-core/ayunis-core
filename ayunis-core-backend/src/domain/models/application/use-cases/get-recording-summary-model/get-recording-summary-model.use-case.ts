import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredOrgId } from 'src/common/context/required-context';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';
import { RecordingSummaryModelsRepository } from 'src/domain/models/application/ports/recording-summary-models.repository';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';

/**
 * The org's recording summary model, or null when summaries use the org
 * default. A selection that was archived or became anonymous-only since it
 * was chosen reads as null, because it can't be used for summaries.
 */
@Injectable()
export class GetRecordingSummaryModelUseCase {
  private readonly logger = new Logger(GetRecordingSummaryModelUseCase.name);

  constructor(
    private readonly recordingSummaryModelsRepository: RecordingSummaryModelsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(): Promise<PermittedLanguageModel | null> {
    const orgId = getRequiredOrgId(this.contextService);
    this.logger.log({ orgId }, 'execute');

    const permittedModel =
      await this.recordingSummaryModelsRepository.find(orgId);
    if (
      !permittedModel ||
      permittedModel.model.isArchived ||
      permittedModel.anonymousOnly
    ) {
      return null;
    }
    return permittedModel;
  }
}
