import { Injectable, Logger } from '@nestjs/common';
import { randomUUID, type UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { GetInferenceCommand } from 'src/domain/models/application/use-cases/get-inference/get-inference.command';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import { CollectUsageAsyncService } from 'src/domain/usage/application/services/collect-usage-async.service';
import { InferenceAdmissionGuard } from 'src/iam/quotas/application/services/inference-admission-guard.service';
import { IncrementTrialMessagesCommand } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.command';
import { IncrementTrialMessagesUseCase } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.use-case';
import { SkillTextModelResolver } from 'src/domain/skills/application/services/skill-text-model-resolver.service';
import {
  SkillTextImprovementFailedError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import {
  ImproveSkillTextCommand,
  SkillTextField,
} from './improve-skill-text.command';
import { buildImproveSkillTextPrompt } from './improve-skill-text.prompt';
import { normalizeSkillText } from 'src/domain/skills/application/util/normalize-skill-text.helper';

type ReportedUsage = { inputTokens?: number; outputTokens?: number };

@Injectable()
export class ImproveSkillTextUseCase {
  private readonly logger = new Logger(ImproveSkillTextUseCase.name);

  constructor(
    private readonly modelResolver: SkillTextModelResolver,
    private readonly inferenceAdmissionGuard: InferenceAdmissionGuard,
    private readonly collectUsageAsyncService: CollectUsageAsyncService,
    private readonly incrementTrialMessagesUseCase: IncrementTrialMessagesUseCase,
    private readonly getInferenceUseCase: GetInferenceUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: ImproveSkillTextCommand): Promise<string> {
    this.logger.log({ field: command.field }, 'improveSkillText');

    const { userId, orgId } = getRequiredUserContext(this.contextService);
    const { model } = await this.modelResolver.resolve(orgId, userId);
    const principal = { userId, orgId };
    await this.inferenceAdmissionGuard.preflight(principal, model);
    await this.inferenceAdmissionGuard.ensureModelCallAllowed(principal, model);
    if (command.consumeTrialMessage) {
      this.consumeTrialMessage(orgId);
    }

    const response = await this.getInferenceUseCase.execute(
      this.buildInferenceCommand(command, model),
    );
    const improved = normalizeSkillText(
      response.content
        .filter((content) => content instanceof TextMessageContent)
        .map((content) => content.text)
        .join(''),
    );
    if (!improved) {
      throw new SkillTextImprovementFailedError({ field: command.field });
    }
    return improved;
  }

  private buildInferenceCommand(
    command: ImproveSkillTextCommand,
    model: LanguageModel,
  ): GetInferenceCommand {
    const message = new UserMessage({
      threadId: randomUUID(),
      content: [new TextMessageContent(buildImproveSkillTextPrompt(command))],
    });
    return new GetInferenceCommand({
      model,
      messages: [message],
      tools: [],
      toolChoice: ModelToolChoice.AUTO,
      onUsage: (usage) => this.recordUsage(model, usage, command.field),
    });
  }

  // Fire-and-forget like send-message: a rewrite admitted on trial capacity
  // counts against the trial cap, but trial accounting must never delay or
  // fail the rewrite itself.
  private consumeTrialMessage(orgId: UUID): void {
    this.incrementTrialMessagesUseCase
      .execute(new IncrementTrialMessagesCommand(orgId))
      .catch((error: unknown) => {
        this.logger.error(
          {
            orgId,
            error: error instanceof Error ? error.message : String(error),
          },
          'Failed to increment trial messages',
        );
      });
  }

  // Same contract as the agent runtime's usage hook: a paid call that reports
  // no usage, or whose usage cannot be persisted, must not hand out its result,
  // otherwise the credit budget the admission check enforced is never charged.
  private async recordUsage(
    model: LanguageModel,
    usage: ReportedUsage,
    field: SkillTextField,
  ): Promise<void> {
    const reported =
      usage.inputTokens !== undefined || usage.outputTokens !== undefined;
    if (!reported) {
      if (model.consumesCredits) {
        throw new SkillTextImprovementFailedError({
          field,
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
