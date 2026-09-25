import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { GetInferenceCommand } from 'src/domain/models/application/use-cases/get-inference/get-inference.command';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import { InferenceUsageGuard } from 'src/domain/runs/application/services/inference-usage-guard.service';
import { SkillTextModelResolver } from 'src/domain/skill-authoring/application/services/skill-text-model-resolver.service';
import {
  SkillTextImprovementFailedError,
  UnexpectedSkillAuthoringError,
} from 'src/domain/skill-authoring/application/skill-authoring.errors';
import { ImproveSkillTextCommand } from './improve-skill-text.command';
import { buildImproveSkillTextPrompt } from './improve-skill-text.prompt';

@Injectable()
export class ImproveSkillTextUseCase {
  private readonly logger = new Logger(ImproveSkillTextUseCase.name);

  constructor(
    private readonly modelResolver: SkillTextModelResolver,
    private readonly inferenceUsageGuard: InferenceUsageGuard,
    private readonly getInferenceUseCase: GetInferenceUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillAuthoringError)
  async execute(command: ImproveSkillTextCommand): Promise<string> {
    this.logger.log({ field: command.field }, 'improveSkillText');

    const { userId, orgId } = getRequiredUserContext(this.contextService);
    const { model } = await this.modelResolver.resolve(orgId, userId);
    const principal = { userId, orgId };
    await this.inferenceUsageGuard.preflight(principal, model);
    await this.inferenceUsageGuard.ensureModelCallAllowed(principal, model);

    const response = await this.getInferenceUseCase.execute(
      new GetInferenceCommand({
        model,
        messages: [
          new UserMessage({
            threadId: randomUUID(),
            content: [
              new TextMessageContent(buildImproveSkillTextPrompt(command)),
            ],
          }),
        ],
        tools: [],
        toolChoice: ModelToolChoice.AUTO,
      }),
    );
    this.inferenceUsageGuard.collectUsage(model, {
      inputTokens: response.meta.inputTokens ?? 0,
      outputTokens: response.meta.outputTokens ?? 0,
    });

    const improved = this.stripSurroundingQuotes(
      response.content
        .filter((content) => content instanceof TextMessageContent)
        .map((content) => content.text)
        .join('')
        .trim(),
    );
    if (!improved) {
      throw new SkillTextImprovementFailedError({ field: command.field });
    }
    return improved;
  }

  private stripSurroundingQuotes(text: string): string {
    const quoted = /^["'„»](.*)["'“«]$/s.exec(text);
    return quoted ? quoted[1].trim() : text;
  }
}
