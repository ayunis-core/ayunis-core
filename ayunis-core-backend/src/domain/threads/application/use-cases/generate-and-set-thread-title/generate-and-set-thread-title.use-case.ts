import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';

@Injectable()
export class GenerateAndSetThreadTitleUseCase {
  constructor(
    @InjectPinoLogger(GenerateAndSetThreadTitleUseCase.name)
    private readonly logger: PinoLogger,
    private readonly updateThreadTitleUseCase: UpdateThreadTitleUseCase,
    private readonly triggerInferenceUseCase: GetInferenceUseCase,
  ) {}

  async execute(
    command: GenerateAndSetThreadTitleCommand,
  ): Promise<string | null> {
    this.logger.info({ threadId: command.thread.id }, 'generateAndSetTitle');

    try {
      return await this.generateTitle(command);
    } catch (error) {
      const logContext = {
        threadId: command.thread.id,
        err: this.toTitleGenerationError(command.thread.id, error),
      };
      this.logger.error(logContext, 'Failed to generate title');
      return null;
    }
  }

  private async generateTitle(
    command: GenerateAndSetThreadTitleCommand,
  ): Promise<string> {
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
    const title = this.stripMarkdownFormatting(
      firstContent.text
        .replace(/<think(ing)?>([\s\S]*?)<\/think(ing)?>/g, '')
        .trim(),
    );
    if (!title) {
      throw new EmptyTitleResponseError(command.thread.id);
    }
    await this.updateThreadTitleUseCase.execute(
      new UpdateThreadTitleCommand({ threadId: command.thread.id, title }),
    );
    return title;
  }

  private toTitleGenerationError(threadId: string, error: unknown): Error {
    if (
      error instanceof EmptyTitleResponseError ||
      error instanceof InvalidTitleResponseTypeError
    ) {
      return error;
    }
    return new TitleGenerationError(threadId, error as Error);
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
        .replace(/\[([^\]\r\n]{1,500})\]\([^)\r\n]{1,2000}\)/g, '$1')
        // Remove quotes
        .replace(/"/g, '')
        // Clean up any extra whitespace
        .replace(/\s+/g, ' ')
        .trim()
    );
  }
}
