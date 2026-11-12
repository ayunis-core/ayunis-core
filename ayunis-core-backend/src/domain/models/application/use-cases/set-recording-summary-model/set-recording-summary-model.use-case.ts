import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredOrgId } from 'src/common/context/required-context';
import {
  PermittedModelNotFoundError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';
import { AnonymousOnlySummaryModelError } from 'src/domain/models/application/recording-summary-model.errors';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { RecordingSummaryModelsRepository } from 'src/domain/models/application/ports/recording-summary-models.repository';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { SetRecordingSummaryModelCommand } from './set-recording-summary-model.command';

@Injectable()
export class SetRecordingSummaryModelUseCase {
  private readonly logger = new Logger(SetRecordingSummaryModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly recordingSummaryModelsRepository: RecordingSummaryModelsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    command: SetRecordingSummaryModelCommand,
  ): Promise<PermittedLanguageModel | null> {
    const orgId = getRequiredOrgId(this.contextService);
    this.logger.log(
      { orgId, permittedModelId: command.permittedModelId },
      'execute',
    );

    if (!command.permittedModelId) {
      await this.recordingSummaryModelsRepository.clear(orgId);
      return null;
    }
    const permittedModel = await this.findSelectable(
      orgId,
      command.permittedModelId,
    );
    await this.recordingSummaryModelsRepository.set(orgId, permittedModel.id);
    return permittedModel;
  }

  /** Summaries are org-wide, so team grants are not selectable. */
  private async findSelectable(
    orgId: UUID,
    permittedModelId: UUID,
  ): Promise<PermittedLanguageModel> {
    const permittedModel = await this.permittedModelsRepository.findOneLanguage(
      { id: permittedModelId, orgId },
    );
    if (permittedModel?.scope !== PermittedModelScope.ORG) {
      throw new PermittedModelNotFoundError(permittedModelId);
    }
    if (permittedModel.anonymousOnly) {
      throw new AnonymousOnlySummaryModelError(permittedModelId);
    }
    return permittedModel;
  }
}
