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
  RunUserInput,
} from 'src/domain/runs/domain/run-input.entity';
import { RunNoModelFoundError } from '../../runs.errors';
import { Thread } from '../../../../threads/domain/thread.entity';
import { FindOneAgentUseCase } from 'src/domain/agents/application/use-cases/find-one-agent/find-one-agent.use-case';
import { FindOneAgentQuery } from 'src/domain/agents/application/use-cases/find-one-agent/find-one-agent.query';
import { Agent } from 'src/domain/agents/domain/agent.entity';
import { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { AnonymizeTextCommand } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.command';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class ExecuteRunAndSetTitleUseCase {
  private readonly logger = new Logger(ExecuteRunAndSetTitleUseCase.name);

  constructor(
    private readonly executeRunUseCase: ExecuteRunUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly findOneAgentUseCase: FindOneAgentUseCase,
    private readonly generateAndSetThreadTitleUseCase: GenerateAndSetThreadTitleUseCase,
    private readonly messageDtoMapper: MessageDtoMapper,
    private readonly anonymizeTextUseCase: AnonymizeTextUseCase,
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

      const { thread } = await this.findThreadUseCase.execute(
        new FindThreadQuery(command.threadId),
      );

      // If thread has no messages, we should generate a title after the first message
      const shouldGenerateTitle = thread.messages.length === 0;

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
      if (shouldGenerateTitle) {
        const titleResponse = await this.generateTitle(command, thread);
        if (titleResponse) {
          yield titleResponse;
        }
      }
    } catch (error) {
      this.logger.error('Error in executeRunAndSetTitle', error);

      // Preserve error code from domain errors (e.g., RUN_NO_MODEL_FOUND)
      const errorCode =
        error instanceof ApplicationError ? error.code : 'EXECUTION_ERROR';

      // Yield error response
      const errorResponse: RunErrorResponseDto = {
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'An error occurred while executing the run',
        threadId: command.threadId,
        timestamp: new Date().toISOString(),
        code: errorCode,
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

  private async generateTitle(
    command: ExecuteRunAndSetTitleCommand,
    thread: Thread,
  ): Promise<RunThreadResponseDto | null> {
    try {
      // Extract the first user message for title generation
      const firstUserMessage = this.extractUserMessage(command.input);

      if (!firstUserMessage) {
        return null;
      }

      // Anonymize the message if thread is in privacy mode
      const messageForTitle = thread.isAnonymous
        ? await this.anonymizeText(firstUserMessage)
        : firstUserMessage;

      this.logger.log('Generating thread title', {
        threadId: command.threadId,
        isAnonymous: thread.isAnonymous,
      });

      // Fetch agent if thread has agentId
      let agent: Agent | undefined;
      if (thread.agentId) {
        agent = (
          await this.findOneAgentUseCase.execute(
            new FindOneAgentQuery(thread.agentId),
          )
        ).agent;
      }

      const model = thread.model ?? agent?.model;
      if (!model) {
        throw new RunNoModelFoundError({
          threadId: command.threadId,
        });
      }

      const title = await this.generateAndSetThreadTitleUseCase.execute(
        new GenerateAndSetThreadTitleCommand({
          thread,
          model: model.model,
          message: messageForTitle,
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
      this.logger.warn('Error in generateTitle', {
        threadId: command.threadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  private extractUserMessage(input: RunInput): string | undefined {
    if (input instanceof RunUserInput) {
      return input.text;
    }
    return undefined;
  }

  private async anonymizeText(text: string): Promise<string> {
    try {
      const result = await this.anonymizeTextUseCase.execute(
        new AnonymizeTextCommand(text, 'de'),
      );
      if (result.replacements.length > 0) {
        this.logger.log('Anonymized text for title generation', {
          originalLength: text.length,
          anonymizedLength: result.anonymizedText.length,
          replacementsCount: result.replacements.length,
        });
      }
      return result.anonymizedText;
    } catch (error) {
      this.logger.error('Failed to anonymize text, returning original', {
        error: error as Error,
      });
      return text;
    }
  }
}
