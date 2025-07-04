import {
  Body,
  Controller,
  Logger,
  Sse,
  Post,
  HttpException,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  MessageEvent,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiBody,
  ApiTags,
  ApiResponse,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';
import { SendMessageDto } from './dto/send-message.dto';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import {
  UserMessageResponseDto,
  AssistantMessageResponseDto,
  ToolResultMessageResponseDto,
  SystemMessageResponseDto,
} from '../../../threads/presenters/http/dto/message-response.dto';
import { Observable } from 'rxjs';
import { RunSessionManager } from './sse/run-session.manager';
import { RunInputMapper } from './mappers/run-input.mapper';
import {
  RunSessionResponseDto,
  RunMessageResponseDto,
  RunErrorResponseDto,
  RunThreadResponseDto,
  RunResponse,
} from './dto/run-response.dto';
import { ExecuteRunAndSetTitleUseCase } from '../../application/use-cases/execute-run-and-set-title/execute-run-and-set-title.use-case';
import { ExecuteRunAndSetTitleCommand } from '../../application/use-cases/execute-run-and-set-title/execute-run-and-set-title.command';
import { RequireSubscription } from 'src/iam/authorization/application/decorators/subscription.decorator';

@ApiTags('runs')
@ApiExtraModels(
  UserMessageResponseDto,
  AssistantMessageResponseDto,
  ToolResultMessageResponseDto,
  SystemMessageResponseDto,
  RunSessionResponseDto,
  RunMessageResponseDto,
  RunErrorResponseDto,
  RunThreadResponseDto,
  SendMessageDto,
)
@Controller('runs')
export class RunsController {
  private readonly logger = new Logger(RunsController.name);

  constructor(
    private readonly executeRunAndSetTitleUseCase: ExecuteRunAndSetTitleUseCase,
    private readonly runSessionManager: RunSessionManager,
  ) {}

  @ApiOperation({
    summary: 'Connect to the run stream and receive a session ID',
    description:
      'Establishes a server-sent events connection and returns a session ID for sending messages',
  })
  @ApiResponse({
    status: 200,
    description: 'Server-sent events stream with discriminated response types',
    content: {
      'text/event-stream': {
        schema: {
          oneOf: [
            { $ref: getSchemaPath(RunSessionResponseDto) },
            { $ref: getSchemaPath(RunMessageResponseDto) },
            { $ref: getSchemaPath(RunErrorResponseDto) },
            { $ref: getSchemaPath(RunThreadResponseDto) },
          ],
          discriminator: {
            propertyName: 'type',
            mapping: {
              session: getSchemaPath(RunSessionResponseDto),
              message: getSchemaPath(RunMessageResponseDto),
              error: getSchemaPath(RunErrorResponseDto),
              thread: getSchemaPath(RunThreadResponseDto),
            },
          },
        },
        examples: {
          'session-event': {
            summary: 'Session establishment event',
            value: {
              type: 'session',
              success: true,
              threadId: '123e4567-e89b-12d3-a456-426614174000',
              timestamp: '2024-01-01T12:00:00.000Z',
            },
          },
          'message-event': {
            summary: 'Message event',
            value: {
              type: 'message',
              message: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                threadId: '123e4567-e89b-12d3-a456-426614174000',
                role: 'assistant',
                content: [{ type: 'text', text: 'Hello!' }],
                createdAt: '2024-01-01T12:00:00.000Z',
              },
              threadId: '123e4567-e89b-12d3-a456-426614174000',
              timestamp: '2024-01-01T12:00:00.000Z',
            },
          },
          'error-event': {
            summary: 'Error event',
            value: {
              type: 'error',
              message: 'An error occurred while processing your request',
              threadId: '123e4567-e89b-12d3-a456-426614174000',
              timestamp: '2024-01-01T12:00:00.000Z',
              code: 'EXECUTION_ERROR',
            },
          },
          'thread-event': {
            summary: 'Thread update event',
            value: {
              type: 'thread',
              threadId: '123e4567-e89b-12d3-a456-426614174000',
              updateType: 'title_updated',
              title: 'Discussion about AI and machine learning',
              timestamp: '2024-01-01T12:00:00.000Z',
            },
          },
        },
      },
    },
    headers: {
      'Content-Type': {
        description: 'Content type for server-sent events',
        schema: { type: 'string', example: 'text/event-stream' },
      },
      'Cache-Control': {
        description: 'Cache control header',
        schema: { type: 'string', example: 'no-cache' },
      },
      Connection: {
        description: 'Connection type',
        schema: { type: 'string', example: 'keep-alive' },
      },
    },
  })
  @Sse('stream/:threadId')
  connectToStream(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('threadId', ParseUUIDPipe) threadId: UUID,
  ): Observable<MessageEvent> {
    this.logger.log('connectToStream', { userId, threadId });

    return new Observable((subscriber) => {
      try {
        // Create a new session
        const session = this.runSessionManager.createSession(userId, threadId);

        // Send session establishment event
        const sessionResponse: RunSessionResponseDto = {
          type: 'session',
          success: true,
          threadId: threadId,
          timestamp: new Date().toISOString(),
        };

        const sessionEvent: MessageEvent = {
          id: 'session',
          data: sessionResponse,
        };

        // Send the session event immediately
        subscriber.next(sessionEvent);

        // Subscribe to messages for this session
        const messageSubscription = session.messageSubject.subscribe({
          next: (response: RunResponse) => {
            // Generate appropriate event ID based on response type
            let eventId: string;
            switch (response.type) {
              case 'message':
                eventId = response.message.id;
                break;
              case 'thread':
                eventId = `thread-${response.threadId}`;
                break;
              case 'error':
                eventId = 'error';
                break;
              case 'session':
                eventId = 'session';
                break;
              default:
                eventId = 'event';
            }

            const messageEvent: MessageEvent = {
              id: eventId,
              data: response,
            };
            subscriber.next(messageEvent);
          },
          error: (error) => {
            // Send error response through the stream
            const errorResponse: RunErrorResponseDto = {
              type: 'error',
              message:
                error.message || 'An error occurred in the message stream',
              threadId: threadId,
              timestamp: new Date().toISOString(),
              code: 'STREAM_ERROR',
              details: { error: error.toString() },
            };

            const errorEvent: MessageEvent = {
              id: 'stream-error',
              data: errorResponse,
            };

            subscriber.next(errorEvent);
            subscriber.error(error);
          },
          complete: () => {
            subscriber.complete();
          },
        });

        // Handle client disconnect
        return () => {
          messageSubscription.unsubscribe();
          this.runSessionManager.closeSession(threadId, userId);
        };
      } catch (error) {
        this.logger.error('Error in connectToStream', {
          userId,
          threadId,
          error,
        });

        // Send error response for connection errors
        const errorResponse: RunErrorResponseDto = {
          type: 'error',
          message: 'Failed to establish connection',
          threadId: threadId,
          timestamp: new Date().toISOString(),
          code: 'CONNECTION_ERROR',
          details: { error: error.toString() },
        };

        const errorEvent: MessageEvent = {
          id: 'connection-error',
          data: errorResponse,
        };

        subscriber.next(errorEvent);
        subscriber.error(error);
      }
    });
  }

  @Post('send-message')
  @RequireSubscription()
  @ApiOperation({
    summary: 'Send a message to an active session',
    description:
      'Sends a user message to the specified session and triggers AI processing',
  })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({
    status: 200,
    description:
      'Message sent successfully. Response will be streamed to the SSE connection.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Message sent to session' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request payload or session not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log('sendMessage', { sendMessageDto, userId });

    // Get the session
    const session = this.runSessionManager.getSession(
      sendMessageDto.threadId,
      userId,
    );
    if (!session) {
      throw new HttpException('Session not found', HttpStatus.BAD_REQUEST);
    }

    try {
      const input = RunInputMapper.toCommand(sendMessageDto.input);

      this.executeRunInBackground({
        threadId: sendMessageDto.threadId,
        input,
        userId,
        streaming: sendMessageDto.streaming,
        orgId,
      });

      return {
        success: true,
        message: 'Message sent to session',
      };
    } catch (error) {
      this.logger.error('Error sending message', error);
      throw new HttpException(
        'Failed to send message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async executeRunInBackground(params: {
    threadId: UUID;
    input: any;
    userId: UUID;
    streaming?: boolean;
    orgId: UUID;
  }) {
    try {
      const command = new ExecuteRunAndSetTitleCommand({
        threadId: params.threadId,
        input: params.input,
        userId: params.userId,
        streaming: params.streaming,
        orgId: params.orgId,
      });

      const eventGenerator = this.executeRunAndSetTitleUseCase.execute(command);

      for await (const event of eventGenerator) {
        const sent = this.runSessionManager.sendMessageToSessions(
          params.threadId,
          event,
        );
        if (!sent) {
          this.logger.warn(
            `Failed to send event to session ${params.threadId} - session may have been closed`,
          );
          break;
        }
      }
    } catch (error) {
      this.logger.error('Error in executeRunInBackground', error);

      // Send structured error response
      const errorResponse: RunErrorResponseDto = {
        type: 'error',
        message: error.message || 'An error occurred while executing the run',
        threadId: params.threadId,
        timestamp: new Date().toISOString(),
        code: 'EXECUTION_ERROR',
        details: {
          error: error.toString(),
          stack: error.stack,
        },
      };

      // Try to send error to session, but don't fail if session is closed
      this.runSessionManager.sendMessageToSessions(
        params.threadId,
        errorResponse,
      );
    }
  }
}
