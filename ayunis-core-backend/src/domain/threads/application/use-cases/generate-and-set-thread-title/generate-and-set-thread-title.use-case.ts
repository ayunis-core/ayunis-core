import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GenerateAndSetThreadTitleCommand } from './generate-and-set-thread-title.command';
import { UpdateThreadTitleUseCase } from '../update-thread-title/update-thread-title.use-case';
import { UpdateThreadTitleCommand } from '../update-thread-title/update-thread-title.command';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { GetInferenceCommand } from 'src/domain/models/application/use-cases/get-inference/get-inference.command';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import {
  EmptyTitleResponseError,
  InvalidTitleResponseTypeError,
  TitleGenerationError,
} from '../../thread-title.errors';
import { UnexpectedThreadError } from '../../threads.errors';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';

@Injectable()
export class GenerateAndSetThreadTitleUseCase {
  private readonly logger = new Logger(GenerateAndSetThreadTitleUseCase.name);

  constructor(
    private readonly updateThreadTitleUseCase: UpdateThreadTitleUseCase,
    private readonly triggerInferenceUseCase: GetInferenceUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedThreadError)
  async execute(
    command: GenerateAndSetThreadTitleCommand,
  ): Promise<string | null> {
    this.logger.log('generateAndSetTitle', { threadId: command.thread.id });

    try {
      const title = await this.generateTitle(command);

      // Update thread with new title
      await this.updateThreadTitleUseCase.execute(
        new UpdateThreadTitleCommand({
          threadId: command.thread.id,
          title,
        }),
      );
      return title;
    } catch (error) {
      this.logTitleGenerationFailure(command.thread.id, error);

      // Don't throw error - just log it
      return null;
    }
  }

  private async generateTitle(
    command: GenerateAndSetThreadTitleCommand,
  ): Promise<string> {
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

    const firstContent = response.content.find(
      (content) => content instanceof TextMessageContent,
    );
    if (!firstContent) {
      throw new InvalidTitleResponseTypeError(
        command.thread.id,
        response.content.map((content) => content.constructor.name).join(', '),
      );
    }

    // Remove extra spaces and <think>...</think> blocks
    let title = firstContent.text
      .replace(/<think(ing)?>([\s\S]*?)<\/think(ing)?>/g, '')
      .trim();

    // Strip markdown formatting
    title = this.stripMarkdownFormatting(title);

    if (!title) {
      throw new EmptyTitleResponseError(command.thread.id);
    }

    return title;
  }

  private logTitleGenerationFailure(threadId: UUID, error: unknown): void {
    let logError = error as Error;
    if (
      !(error instanceof EmptyTitleResponseError) &&
      !(error instanceof InvalidTitleResponseTypeError)
    ) {
      logError = new TitleGenerationError(threadId, error as Error);
    }

    this.logger.error('Failed to generate title', {
      threadId,
      error: logError instanceof Error ? logError.message : 'Unknown error',
    });
  }

  /**
   * Strips markdown formatting from text
   * Removes: bold, italic, code, strikethrough, headers, links, and quotes
   */
  private stripMarkdownFormatting(text: string): string {
    return (
      text
        // Remove bold: **text** or __text__
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        // Remove italic: *text* or _text_ (but not within words)
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/(?<!\w)_(.+?)_(?!\w)/g, '$1')
        // Remove strikethrough: ~~text~~
        .replace(/~~(.+?)~~/g, '$1')
        // Remove inline code: `text`
        .replace(/`(.+?)`/g, '$1')
        // Remove headers: # text
        .replace(/^#{1,6}\s+/gm, '')
        // Remove links: [text](url) -> text
        .replace(/\[([^\]]{1,200})\]\([^)]{1,2000}\)/g, '$1')
        // Remove quotes
        .replace(/"/g, '')
        // Clean up any extra whitespace
        .replace(/\s+/g, ' ')
        .trim()
    );
  }
}
