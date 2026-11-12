import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredOrgId } from 'src/common/context/required-context';
import {
  DefaultModelNotFoundError,
  OnlyAnonymousModelsAvailableError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';
import { NoRecordingSummaryModelError } from 'src/domain/models/application/recording-summary-model.errors';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { GetRecordingSummaryModelUseCase } from 'src/domain/models/application/use-cases/get-recording-summary-model/get-recording-summary-model.use-case';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';

/**
 * The model that summarizes recordings in the current org: the admin's
 * selection, else the org default. Resolved without a user, so team model
 * restrictions and personal defaults don't apply.
 */
@Injectable()
export class ResolveRecordingSummaryModelUseCase {
  private readonly logger = new Logger(
    ResolveRecordingSummaryModelUseCase.name,
  );

  constructor(
    private readonly getRecordingSummaryModelUseCase: GetRecordingSummaryModelUseCase,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(): Promise<PermittedLanguageModel> {
    const orgId = getRequiredOrgId(this.contextService);
    this.logger.log({ orgId }, 'execute');

    const selected = await this.getRecordingSummaryModelUseCase.execute();
    return selected ?? this.orgDefault(orgId);
  }

  private async orgDefault(orgId: UUID): Promise<PermittedLanguageModel> {
    try {
      return await this.getDefaultModelUseCase.execute(
        new GetDefaultModelQuery({ orgId, excludeAnonymousOnly: true }),
      );
    } catch (error) {
      if (
        error instanceof DefaultModelNotFoundError ||
        error instanceof OnlyAnonymousModelsAvailableError
      ) {
        throw new NoRecordingSummaryModelError(orgId);
      }
      throw error;
    }
  }
}
