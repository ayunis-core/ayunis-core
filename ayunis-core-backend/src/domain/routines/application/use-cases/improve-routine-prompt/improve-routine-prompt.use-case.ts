import { Injectable, Logger } from '@nestjs/common';
import { randomUUID, type UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { stripWrappingQuotes } from 'src/common/util/strip-wrapping-quotes';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import type { InferenceResponse } from 'src/domain/models/application/models/inference-response';
import { GetInferenceCommand } from 'src/domain/models/application/use-cases/get-inference/get-inference.command';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import { CollectUsageAsyncService } from 'src/domain/usage/application/services/collect-usage-async.service';
import { InferenceAdmissionGuard } from 'src/iam/quotas/application/services/inference-admission-guard.service';
import { IncrementTrialMessagesCommand } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.command';
import { IncrementTrialMessagesUseCase } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.use-case';
import {
  RoutinePromptImprovementFailedError,
  UnexpectedRoutineError,
} from 'src/domain/routines/application/routines.errors';
import { RoutineModelService } from 'src/domain/routines/application/services/routine-model.service';
import { ImproveRoutinePromptCommand } from './improve-routine-prompt.command';
import { buildImproveRoutinePromptPrompt } from './improve-routine-prompt.prompt';

/**
 * Rewrites a draft routine task without saving it, as one paid call admitted
 * and billed like the skill text improver.
 */
@Injectable()
export class ImproveRoutinePromptUseCase {
  private readonly logger = new Logger(ImproveRoutinePromptUseCase.name);

  constructor(
    private readonly routineModelService: RoutineModelService,
    private readonly inferenceAdmissionGuard: InferenceAdmissionGuard,
    private readonly collectUsageAsyncService: CollectUsageAsyncService,
    private readonly incrementTrialMessagesUseCase: IncrementTrialMessagesUseCase,
    private readonly getInferenceUseCase: GetInferenceUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  async execute(command: ImproveRoutinePromptCommand): Promise<string> {
    this.logger.log('improveRoutinePrompt');

    const { userId, orgId } = getRequiredUserContext(this.contextService);
    const model = await this.routineModelService.forPromptImprovement();
    await this.inferenceAdmissionGuard.preflight({ userId, orgId }, model);
    await this.inferenceAdmissionGuard.ensureModelCallAllowed(
      { userId, orgId },
      model,
    );
    if (command.consumeTrialMessage) {
      this.consumeTrialMessage(orgId);
    }

    const response = await this.getInferenceUseCase.execute(
      new GetInferenceCommand({
        model,
        messages: [
          new UserMessage({
            threadId: randomUUID(),
            content: [
              new TextMessageContent(buildImproveRoutinePromptPrompt(command)),
            ],
          }),
        ],
        tools: [],
        toolChoice: ModelToolChoice.AUTO,
        onUsage: (usage) => this.chargeUsage(model, usage),
      }),
    );
    const improved = stripWrappingQuotes(
      response.content
        .filter((content) => content instanceof TextMessageContent)
        .map((content) => content.text)
        .join(''),
    );
    if (!improved) {
      throw new RoutinePromptImprovementFailedError();
    }
    return improved;
  }

  // Fire-and-forget like send-message: trial accounting must never delay or
  // fail the rewrite itself.
  private consumeTrialMessage(orgId: UUID): void {
    this.incrementTrialMessagesUseCase
      .execute(new IncrementTrialMessagesCommand(orgId))
      .catch((error: unknown) => {
        this.logger.error(
          { orgId, err: error as Error },
          'Failed to increment trial messages',
        );
      });
  }

  // A paid call that reports no usage, or whose usage cannot be persisted,
  // must not hand out its result, or the budget its admission checked is
  // never charged.
  private async chargeUsage(
    model: LanguageModel,
    usage: InferenceResponse['meta'],
  ): Promise<void> {
    if (usage.inputTokens === undefined && usage.outputTokens === undefined) {
      if (model.consumesCredits) {
        throw new RoutinePromptImprovementFailedError({
          reason: 'paid model call reported no usage',
        });
      }
      return;
    }
    await this.collectUsageAsyncService.collectCritical(
      model,
      usage.inputTokens ?? 0,
      usage.outputTokens ?? 0,
    );
  }
}
