import {
  Body,
  Controller,
  Logger,
  Sse,
  Post,
  Param,
  ParseUUIDPipe,
  MessageEvent,
  Req,
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
import { ThreadEventBroadcaster } from './sse/thread-event-broadcaster';
import { RunInputMapper } from './mappers/run-input.mapper';
import {
  RunSessionResponseDto,
  RunMessageResponseDto,
  RunErrorResponseDto,
  RunThreadResponseDto,
  RunHeartbeatResponseDto,
  RunResponse,
} from './dto/run-response.dto';
import { ExecuteRunAndSetTitleUseCase } from '../../application/use-cases/execute-run-and-set-title/execute-run-and-set-title.use-case';
import { ExecuteRunAndSetTitleCommand } from '../../application/use-cases/execute-run-and-set-title/execute-run-and-set-title.command';
import { RequireSubscription } from 'src/iam/authorization/application/decorators/subscription.decorator';
import { RunInput } from '../../domain/run-input.entity';
import { IncrementTrialMessagesUseCase } from 'src/iam/subscriptions/application/use-cases/increment-trial-messages/increment-trial-messages.use-case';
import { IncrementTrialMessagesCommand } from 'src/iam/subscriptions/application/use-cases/increment-trial-messages/increment-trial-messages.command';
import { HasActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { RequestWithSubscriptionContext } from 'src/iam/authorization/application/guards/subscription.guard';

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
  RunHeartbeatResponseDto,
  SendMessageDto,
)
@Controller('runs')
export class RunsController {
  private readonly logger = new Logger(RunsController.name);

  constructor(
    private readonly executeRunAndSetTitleUseCase: ExecuteRunAndSetTitleUseCase,
    private readonly threadEventBroadcaster: ThreadEventBroadcaster,
    private readonly incrementTrialMessagesUseCase: IncrementTrialMessagesUseCase,
    private readonly hasActiveSubscriptionUseCase: HasActiveSubscriptionUseCase,
  ) {}

  @ApiOperation({
    summary: 'Connect to the run stream and receive a session ID',
    description:
      'Establishes a server-sent events connection and returns a session ID for sending messages. The connection includes automatic heartbeat events every 30 seconds to keep the connection alive and detect disconnected clients.',
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
            { $ref: getSchemaPath(RunHeartbeatResponseDto) },
          ],
          discriminator: {
            propertyName: 'type',
            mapping: {
              session: getSchemaPath(RunSessionResponseDto),
              message: getSchemaPath(RunMessageResponseDto),
              error: getSchemaPath(RunErrorResponseDto),
              thread: getSchemaPath(RunThreadResponseDto),
              heartbeat: getSchemaPath(RunHeartbeatResponseDto),
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
          'heartbeat-event': {
            summary: 'Heartbeat event to keep connection alive',
            value: {
              type: 'heartbeat',
              threadId: '123e4567-e89b-12d3-a456-426614174000',
              timestamp: '2024-01-01T12:00:00.000Z',
              sequence: 1,
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
        // Subscribe to thread events (no session creation needed)
        const threadStream =
          this.threadEventBroadcaster.getThreadStream(threadId);

        // Send connection establishment event immediately
        const connectionResponse: RunSessionResponseDto = {
          type: 'session',
          success: true,
          threadId: threadId,
          timestamp: new Date().toISOString(),
        };

        const connectionEvent: MessageEvent = {
          id: 'session',
          data: connectionResponse,
        };

        subscriber.next(connectionEvent);

        // Set up heartbeat mechanism
        let heartbeatSequence = 0;
        const heartbeatInterval = setInterval(() => {
          heartbeatSequence++;
          const heartbeatResponse: RunHeartbeatResponseDto = {
            type: 'heartbeat',
            threadId: threadId,
            timestamp: new Date().toISOString(),
            sequence: heartbeatSequence,
          };

          const heartbeatEvent: MessageEvent = {
            id: `heartbeat-${heartbeatSequence}`,
            data: heartbeatResponse,
          };

          subscriber.next(heartbeatEvent);
        }, 15000); // Send heartbeat every 15 seconds

        // Subscribe to thread events
        const eventSubscription = threadStream.subscribe({
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
              case 'heartbeat':
                eventId = `heartbeat-${response.sequence || 'unknown'}`;
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
                error instanceof Error
                  ? error.message
                  : 'An error occurred in the message stream',
              threadId: threadId,
              timestamp: new Date().toISOString(),
              code: 'STREAM_ERROR',
              details: {
                error:
                  error instanceof Error ? error.toString() : 'Unknown error',
              },
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

        // Handle client disconnect - clean up subscriptions and heartbeat
        return () => {
          eventSubscription.unsubscribe();
          clearInterval(heartbeatInterval);
          this.threadEventBroadcaster.onConnectionDisconnect(threadId);
        };
      } catch (error) {
        this.logger.error('Error in connectToStream', {
          userId,
          threadId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Send error response for connection errors
        const errorResponse: RunErrorResponseDto = {
          type: 'error',
          message: 'Failed to establish connection',
          threadId: threadId,
          timestamp: new Date().toISOString(),
          code: 'CONNECTION_ERROR',
          details: {
            error: error instanceof Error ? error.toString() : 'Unknown error',
          },
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
    description: 'Invalid request payload',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Req() request: RequestWithSubscriptionContext,
  ): { success: boolean; message: string } {
    // No session check needed - directly process message
    const input = RunInputMapper.toCommand(sendMessageDto.input);

    void this.executeRunInBackground({
      threadId: sendMessageDto.threadId,
      input,
      userId,
      streaming: sendMessageDto.streaming,
      orgId,
    });

    const subscriptionContext = request.subscriptionContext;
    if (subscriptionContext?.needsTrialIncrement) {
      this.logger.debug(
        'Incrementing trial messages for non-subscription user',
        {
          orgId,
          userId,
          trialInfo: subscriptionContext.trialInfo,
        },
      );

      void this.incrementTrialMessagesUseCase.execute(
        new IncrementTrialMessagesCommand(orgId),
      );
    }

    return {
      success: true,
      message: 'Message sent for processing',
    };
  }

  private async executeRunInBackground(params: {
    threadId: UUID;
    input: RunInput;
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
        const sent = this.threadEventBroadcaster.broadcastToThread(
          params.threadId,
          event,
        );
        if (!sent) {
          this.logger.warn(
            `Failed to broadcast event to thread ${params.threadId} - no active listeners`,
          );
          break;
        }
      }
    } catch (error) {
      this.logger.error('Error in executeRunInBackground', error);

      // Send structured error response
      const errorResponse: RunErrorResponseDto = {
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'An error occurred while executing the run',
        threadId: params.threadId,
        timestamp: new Date().toISOString(),
        code: 'EXECUTION_ERROR',
        details: {
          error: error instanceof Error ? error.toString() : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'Unknown error',
        },
      };

      // Try to broadcast error to thread listeners
      this.threadEventBroadcaster.broadcastToThread(
        params.threadId,
        errorResponse,
      );
    }
  }
}
