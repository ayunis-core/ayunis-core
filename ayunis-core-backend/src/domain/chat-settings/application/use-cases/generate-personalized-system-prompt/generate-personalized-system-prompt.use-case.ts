import { Injectable, Logger } from '@nestjs/common';
import { GeneratePersonalizedSystemPromptCommand } from './generate-personalized-system-prompt.command';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { GetInferenceCommand } from 'src/domain/models/application/use-cases/get-inference/get-inference.command';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { UpsertUserSystemPromptUseCase } from '../upsert-user-system-prompt/upsert-user-system-prompt.use-case';
import { UpsertUserSystemPromptCommand } from '../upsert-user-system-prompt/upsert-user-system-prompt.command';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { PersonalizedSystemPromptGenerationError } from '../../chat-settings.errors';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import { ApplicationError } from 'src/common/errors/base.error';
import { InferenceResponse } from 'src/domain/models/application/ports/inference.handler';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { UUID } from 'crypto';

/**
 * Synthetic thread ID used for one-shot inference calls that are not part of
 * a real conversation thread.  The nil UUID signals that no persisted thread
 * is involved.
 */
const SYNTHETIC_THREAD_ID = '00000000-0000-0000-0000-000000000000' as UUID;

export interface GeneratePersonalizedSystemPromptResult {
  systemPrompt: string;
  welcomeMessage: string;
}

@Injectable()
export class GeneratePersonalizedSystemPromptUseCase {
  private readonly logger = new Logger(
    GeneratePersonalizedSystemPromptUseCase.name,
  );

  constructor(
    private readonly getInferenceUseCase: GetInferenceUseCase,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
    private readonly upsertUserSystemPromptUseCase: UpsertUserSystemPromptUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: GeneratePersonalizedSystemPromptCommand,
  ): Promise<GeneratePersonalizedSystemPromptResult> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('execute', { userId });

    try {
      const permittedModel = await this.getDefaultModelUseCase.execute(
        new GetDefaultModelQuery({ orgId, userId }),
      );

      const systemPrompt = await this.generateSystemPrompt(
        command,
        permittedModel.model,
      );

      if (!systemPrompt) {
        throw new PersonalizedSystemPromptGenerationError();
      }

      await this.upsertUserSystemPromptUseCase.execute(
        new UpsertUserSystemPromptCommand(systemPrompt),
      );

      const welcomeMessage = await this.generateWelcomeMessageSafe(
        systemPrompt,
        command.preferredName,
        permittedModel.model,
      );

      return { systemPrompt, welcomeMessage };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to generate personalized system prompt', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new PersonalizedSystemPromptGenerationError(
        error instanceof Error ? error : undefined,
      );
    }
  }

  private async generateSystemPrompt(
    command: GeneratePersonalizedSystemPromptCommand,
    model: LanguageModel,
  ): Promise<string> {
    const userInput = this.buildUserInputSummary(command);

    const instructions =
      'You are a helpful configuration assistant for a municipal workplace AI tool. ' +
      'Your task is to write personalized instructions (2-4 sentences) that define ' +
      "the assistant's tone and communication style based on user preferences. " +
      'Do not restrict what topics the user can ask about. ' +
      'Write the instructions in the SAME LANGUAGE as the user input. ' +
      'Generate ONLY the instruction text, nothing else.';

    const response = await this.callInference(
      `My preferences:\n${userInput}`,
      model,
      instructions,
    );
    return this.extractTextFromResponse(response);
  }

  private async generateWelcomeMessage(
    systemPrompt: string,
    preferredName: string,
    model: LanguageModel,
  ): Promise<string> {
    const instructions =
      'You are a helpful configuration assistant for a municipal workplace AI tool. ' +
      'Your task is to generate a short, warm welcome message (1-2 sentences) ' +
      'based on assistant instructions and a user name. ' +
      'Write the welcome message in the SAME LANGUAGE as the instructions. ' +
      'Address the user by their name. ' +
      'Generate ONLY the welcome message text, nothing else.';

    const userMessage =
      `Assistant instructions: "${systemPrompt}"\n` +
      `User's name: "${preferredName}"`;

    const response = await this.callInference(userMessage, model, instructions);
    return this.extractTextFromResponse(response);
  }

  /**
   * Generates a welcome message, returning an empty string on failure so
   * the already-persisted system prompt is not lost.
   */
  private async generateWelcomeMessageSafe(
    systemPrompt: string,
    preferredName: string,
    model: LanguageModel,
  ): Promise<string> {
    try {
      return await this.generateWelcomeMessage(
        systemPrompt,
        preferredName,
        model,
      );
    } catch (error) {
      this.logger.warn('Welcome message generation failed, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return '';
    }
  }

  private async callInference(
    prompt: string,
    model: LanguageModel,
    instructions?: string,
  ): Promise<InferenceResponse> {
    return this.getInferenceUseCase.execute(
      new GetInferenceCommand({
        model,
        messages: [
          new UserMessage({
            threadId: SYNTHETIC_THREAD_ID,
            content: [new TextMessageContent(prompt)],
          }),
        ],
        tools: [],
        toolChoice: ModelToolChoice.AUTO,
        instructions,
      }),
    );
  }

  private extractTextFromResponse(response: InferenceResponse): string {
    const textContent = response.content.find(
      (c): c is TextMessageContent => c instanceof TextMessageContent,
    );
    if (!textContent) {
      throw new PersonalizedSystemPromptGenerationError();
    }

    return textContent.text.trim();
  }

  private buildUserInputSummary(
    command: GeneratePersonalizedSystemPromptCommand,
  ): string {
    const parts = [`Name: ${command.preferredName}`];

    if (command.communicationStyle) {
      parts.push(`Communication style: ${command.communicationStyle}`);
    }

    if (command.workContext) {
      parts.push(`Work context: ${command.workContext}`);
    }

    return parts.join('\n');
  }
}
