import { Injectable, Logger } from '@nestjs/common';
import { randomUUID, type UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { GetEffectiveLanguageModelsQuery } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.query';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { GetOrgDefaultModelQuery } from 'src/domain/models/application/use-cases/get-org-default-model/get-org-default-model.query';
import { GetOrgDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-org-default-model/get-org-default-model.use-case';
import { GetInferenceCommand } from 'src/domain/models/application/use-cases/get-inference/get-inference.command';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import {
  SkillTextImprovementFailedError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { ImproveSkillTextCommand } from './improve-skill-text.command';
import { buildImproveSkillTextPrompt } from './improve-skill-text.prompt';

@Injectable()
export class ImproveSkillTextUseCase {
  private readonly logger = new Logger(ImproveSkillTextUseCase.name);

  constructor(
    private readonly getOrgDefaultModelUseCase: GetOrgDefaultModelUseCase,
    private readonly getEffectiveLanguageModelsUseCase: GetEffectiveLanguageModelsUseCase,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
    private readonly getInferenceUseCase: GetInferenceUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: ImproveSkillTextCommand): Promise<string> {
    this.logger.log({ field: command.field }, 'improveSkillText');

    const { userId, orgId } = getRequiredUserContext(this.contextService);
    const permittedModel = await this.resolveModel(orgId, userId);

    const response = await this.getInferenceUseCase.execute(
      new GetInferenceCommand({
        model: permittedModel.model,
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

    const improved = response.content
      .filter((content) => content instanceof TextMessageContent)
      .map((content) => content.text)
      .join('')
      .trim();

    if (!improved) {
      throw new SkillTextImprovementFailedError({ field: command.field });
    }
    return this.stripSurroundingQuotes(improved);
  }

  private async resolveModel(
    orgId: UUID,
    userId: UUID,
  ): Promise<PermittedLanguageModel> {
    const orgDefault = await this.getOrgDefaultModelUseCase.execute(
      new GetOrgDefaultModelQuery(orgId),
    );
    if (orgDefault) {
      const { models } = await this.getEffectiveLanguageModelsUseCase.execute(
        new GetEffectiveLanguageModelsQuery(orgId, userId),
      );
      const usable = models.find(
        (model) => model.model.id === orgDefault.model.id,
      );
      if (usable) return usable;
    }
    return this.getDefaultModelUseCase.execute(
      new GetDefaultModelQuery({ orgId, userId }),
    );
  }

  private stripSurroundingQuotes(text: string): string {
    const quoted = /^["'„»](.*)["'“«]$/s.exec(text);
    return quoted ? quoted[1].trim() : text;
  }
}
