import { Injectable, Logger } from '@nestjs/common';
import { ExecuteRunAndSetTitleCommand } from './execute-run-and-set-title.command';
import { ExecuteRunUseCase } from '../execute-run/execute-run.use-case';
import { ExecuteRunCommand } from '../execute-run/execute-run.command';
import { FindThreadUseCase } from '../../../../threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from '../../../../threads/application/use-cases/find-thread/find-thread.query';
import { GenerateAndSetThreadTitleUseCase } from '../../../../threads/application/use-cases/generate-and-set-thread-title/generate-and-set-thread-title.use-case';
import { GenerateAndSetThreadTitleCommand } from '../../../../threads/application/use-cases/generate-and-set-thread-title/generate-and-set-thread-title.command';
import { MessageDtoMapper } from '../../../../threads/presenters/http/mappers/message.mapper';
import {
  RunMessageResponseDto,
  RunThreadResponseDto,
  RunErrorResponseDto,
  RunResponse,
  RunSessionResponseDto,
} from '../../../presenters/http/dto/run-response.dto';
import {
  RunInput,
  RunTextInput,
} from 'src/domain/runs/domain/run-input.entity';
import { RunNoModelFoundError } from '../../runs.errors';

@Injectable()
export class ExecuteRunAndSetTitleUseCase {
  private readonly logger = new Logger(ExecuteRunAndSetTitleUseCase.name);

  constructor(
    private readonly executeRunUseCase: ExecuteRunUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly generateAndSetThreadTitleUseCase: GenerateAndSetThreadTitleUseCase,
    private readonly messageDtoMapper: MessageDtoMapper,
  ) {}

  async *execute(
    command: ExecuteRunAndSetTitleCommand,
  ): AsyncGenerator<RunResponse> {
    try {
      const streamingStartResponse: RunSessionResponseDto = {
        type: 'session',
        streaming: true,
        threadId: command.threadId,
        timestamp: new Date().toISOString(),
      };
      yield streamingStartResponse;
      const titleResponse = await this.generateTitleIfNeeded(command);
      if (titleResponse) {
        yield titleResponse;
      }
      // Execute the run and stream messages
      const messageGenerator = await this.executeRunUseCase.execute(
        new ExecuteRunCommand({
          threadId: command.threadId,
          input: command.input,
          streaming: command.streaming,
        }),
      );

      for await (const message of messageGenerator) {
        const messageDto = this.messageDtoMapper.toDto(message);

        // Yield message response
        const messageResponse: RunMessageResponseDto = {
          type: 'message',
          message: messageDto,
          threadId: command.threadId,
          timestamp: new Date().toISOString(),
        };
        yield messageResponse;
      }
    } catch (error) {
      this.logger.error('Error in executeRunAndSetTitle', error);

      // Yield error response
      const errorResponse: RunErrorResponseDto = {
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'An error occurred while executing the run',
        threadId: command.threadId,
        timestamp: new Date().toISOString(),
        code: 'EXECUTION_ERROR',
        details: {
          error: error instanceof Error ? error.toString() : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'Unknown error',
        },
      };

      yield errorResponse;
    } finally {
      const streamingEndResponse: RunSessionResponseDto = {
        type: 'session',
        streaming: false,
        threadId: command.threadId,
        timestamp: new Date().toISOString(),
      };
      yield streamingEndResponse;
    }
  }

  private async generateTitleIfNeeded(
    command: ExecuteRunAndSetTitleCommand,
  ): Promise<RunThreadResponseDto | null> {
    try {
      const thread = await this.findThreadUseCase.execute(
        new FindThreadQuery(command.threadId),
      );
      this.logger.debug('retrieved thread', { thread });

      // If thread has no messages, we should generate a title after the first message
      const shouldGenerateTitle = thread.messages.length === 0;
      if (!shouldGenerateTitle) {
        return null;
      }

      // Extract the first user message for title generation
      const firstUserMessage = this.extractUserMessage(command.input);
      this.logger.debug('shouldGenerateTitle', { shouldGenerateTitle });
      this.logger.debug('firstUserMessage', { firstUserMessage });

      if (!firstUserMessage) {
        return null;
      }

      this.logger.log('Generating thread title', {
        threadId: command.threadId,
        messagePreview: firstUserMessage.substring(0, 50),
      });

      const model = thread.model ?? thread.agent?.model;
      if (!model) {
        throw new RunNoModelFoundError({
          threadId: command.threadId,
        });
      }

      const title = await this.generateAndSetThreadTitleUseCase.execute(
        new GenerateAndSetThreadTitleCommand({
          thread,
          model: model.model,
          message: firstUserMessage,
        }),
      );

      if (title) {
        return {
          type: 'thread',
          threadId: thread.id,
          updateType: 'title_updated',
          title: title,
          timestamp: new Date().toISOString(),
        };
      }

      return null;
    } catch (error) {
      this.logger.warn('Error in generateTitleIfNeeded', {
        threadId: command.threadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  private extractUserMessage(input: RunInput): string | undefined {
    if (input instanceof RunTextInput) {
      return input.text;
    }
    return undefined;
  }
}
