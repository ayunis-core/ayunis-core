import { Injectable, Logger } from '@nestjs/common';
import { GenerateAndSetThreadTitleCommand } from './generate-and-set-thread-title.command';
import { UpdateThreadTitleUseCase } from '../update-thread-title/update-thread-title.use-case';
import { UpdateThreadTitleCommand } from '../update-thread-title/update-thread-title.command';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { GetInferenceCommand } from 'src/domain/models/application/use-cases/get-inference/get-inference.command';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text.message-content.entity';
import {
  EmptyTitleResponseError,
  InvalidTitleResponseTypeError,
  TitleGenerationError,
} from '../../thread-title.errors';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';

@Injectable()
export class GenerateAndSetThreadTitleUseCase {
  private readonly logger = new Logger(GenerateAndSetThreadTitleUseCase.name);

  constructor(
    private readonly updateThreadTitleUseCase: UpdateThreadTitleUseCase,
    private readonly triggerInferenceUseCase: GetInferenceUseCase,
  ) {}

  async execute(
    command: GenerateAndSetThreadTitleCommand,
  ): Promise<string | null> {
    this.logger.log('generateAndSetTitle', { threadId: command.thread.id });

    try {
      // Prompt for title generation
      const prompt = `Based on the following user message, generate a short, concise title (maximum 50 characters):
      
      "${command.message}"
      
      Title:`;
      const userMessage = new UserMessage({
        threadId: command.thread.id,
        content: [new TextMessageContent(prompt)],
      });

      const response = await this.triggerInferenceUseCase.execute(
        new GetInferenceCommand({
          model: command.model,
          messages: [userMessage],
          tools: [],
          toolChoice: ModelToolChoice.AUTO,
        }),
      );

      // Validate response content
      if (!response.content.length) {
        throw new EmptyTitleResponseError(command.thread.id);
      }

      const firstContent = response.content[0];
      if (!(firstContent instanceof TextMessageContent)) {
        throw new InvalidTitleResponseTypeError(
          command.thread.id,
          firstContent.constructor.name,
        );
      }

      const title = firstContent.text.trim();
      if (!title) {
        throw new EmptyTitleResponseError(command.thread.id);
      }

      // Update thread with new title
      await this.updateThreadTitleUseCase.execute(
        new UpdateThreadTitleCommand(command.thread.id, command.userId, title),
      );
      return title;
    } catch (error) {
      // Log the error with appropriate context
      let logError = error;
      if (
        !(error instanceof EmptyTitleResponseError) &&
        !(error instanceof InvalidTitleResponseTypeError)
      ) {
        logError = new TitleGenerationError(command.thread.id, error);
      }

      this.logger.error('Failed to generate title', {
        threadId: command.thread.id,
        error: logError,
      });

      // Don't throw error - just log it
      return null;
    }
  }
}
