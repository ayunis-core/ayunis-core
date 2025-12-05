import {
  Body,
  Controller,
  Logger,
  Post,
  Req,
  Res,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiOperation,
  ApiBody,
  ApiTags,
  ApiResponse,
  getSchemaPath,
  ApiExtraModels,
  ApiConsumes,
} from '@nestjs/swagger';
import {
  SendMessageDto,
  TextInput,
  ToolResultInput,
} from './dto/send-message.dto';
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
  MessageContentResponseDto,
  TextMessageContentResponseDto,
  ToolUseMessageContentResponseDto,
  ToolResultMessageContentResponseDto as ToolResultContentDto,
  ThinkingMessageContentResponseDto,
} from '../../../threads/presenters/http/dto/get-thread-response.dto/message-response.dto';
import { RunInputMapper } from './mappers/run-input.mapper';
import {
  RunSessionResponseDto,
  RunMessageResponseDto,
  RunErrorResponseDto,
  RunThreadResponseDto,
} from './dto/run-response.dto';
import { ExecuteRunAndSetTitleUseCase } from '../../application/use-cases/execute-run-and-set-title/execute-run-and-set-title.use-case';
import { ExecuteRunAndSetTitleCommand } from '../../application/use-cases/execute-run-and-set-title/execute-run-and-set-title.command';
import { RequireSubscription } from 'src/iam/authorization/application/decorators/subscription.decorator';
import { RunInput } from '../../domain/run-input.entity';
import { IncrementTrialMessagesUseCase } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.use-case';
import { IncrementTrialMessagesCommand } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.command';
import { HasActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { RequestWithSubscriptionContext } from 'src/iam/authorization/application/guards/subscription.guard';
import { Response } from 'express';

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per image
const MAX_TOTAL_SIZE_BYTES = 50 * 1024 * 1024; // 50MB total
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

@ApiTags('runs')
@ApiExtraModels(
  UserMessageResponseDto,
  AssistantMessageResponseDto,
  ToolResultMessageResponseDto,
  SystemMessageResponseDto,
  MessageContentResponseDto,
  TextMessageContentResponseDto,
  ToolUseMessageContentResponseDto,
  ToolResultContentDto,
  ThinkingMessageContentResponseDto,
  RunSessionResponseDto,
  RunMessageResponseDto,
  RunErrorResponseDto,
  RunThreadResponseDto,
  SendMessageDto,
  TextInput,
  ToolResultInput,
)
@Controller('runs')
export class RunsController {
  private readonly logger = new Logger(RunsController.name);

  constructor(
    private readonly executeRunAndSetTitleUseCase: ExecuteRunAndSetTitleUseCase,
    private readonly incrementTrialMessagesUseCase: IncrementTrialMessagesUseCase,
    private readonly hasActiveSubscriptionUseCase: HasActiveSubscriptionUseCase,
  ) {}

  @Post('send-message')
  @RequireSubscription()
  @UseInterceptors(
    FilesInterceptor('images', MAX_IMAGES, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
      fileFilter: (req, file, cb) => {
        if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(`Invalid file type: ${file.mimetype}`),
            false,
          );
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Send a message with optional images and receive streaming response',
    description:
      'Sends a user message (with optional image attachments) and returns a server-sent events stream with the AI response. Images are processed transactionally with the message.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['threadId'],
      properties: {
        threadId: { type: 'string', format: 'uuid' },
        text: {
          type: 'string',
          description: 'Message text (optional if images provided)',
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description:
            'Image files to attach (max 10, max 10MB each, 50MB total)',
        },
        imageAltTexts: {
          type: 'string',
          description: 'JSON array of alt texts matching image order',
        },
        toolResult: {
          type: 'string',
          description: 'JSON object for tool result input',
        },
        streaming: { type: 'boolean', default: true },
      },
    },
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
              streaming: true,
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
  @ApiResponse({
    status: 400,
    description: 'Invalid request payload',
  })
  @ApiResponse({
    status: 403,
    description: 'Subscription required',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Req() request: RequestWithSubscriptionContext,
    @Res() response: Response,
  ): Promise<void> {
    const uploadedFiles = files ?? [];

    this.logger.log('sendMessage', {
      userId,
      threadId: sendMessageDto.threadId,
      streaming: sendMessageDto.streaming,
      fileCount: uploadedFiles.length,
      hasText: !!sendMessageDto.text?.trim(),
      hasToolResult: !!sendMessageDto.toolResult,
    });

    // Validate: at least text, images, or tool result must be provided
    if (
      !sendMessageDto.text?.trim() &&
      uploadedFiles.length === 0 &&
      !sendMessageDto.toolResult
    ) {
      throw new BadRequestException(
        'Message must contain text, images, or tool result',
      );
    }

    // Validate total file size
    const totalSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      throw new BadRequestException(
        `Total file size (${Math.round(totalSize / (1024 * 1024))}MB) exceeds maximum (${MAX_TOTAL_SIZE_BYTES / (1024 * 1024)}MB)`,
      );
    }

    // Set SSE headers
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.setHeader(
      'Access-Control-Allow-Headers',
      'Cache-Control, Content-Type',
    );
    response.setHeader('Access-Control-Allow-Credentials', 'true');

    // Send initial connection confirmation
    response.write(': connection established\n\n');

    try {
      // Send session establishment event immediately
      const sessionResponse: RunSessionResponseDto = {
        type: 'session',
        success: true,
        threadId: sendMessageDto.threadId,
        timestamp: new Date().toISOString(),
        streaming: sendMessageDto.streaming ?? true,
      };

      this.writeSSEEvent(response, 'session', sessionResponse);

      // Handle subscription context
      const subscriptionContext = request.subscriptionContext;

      if (subscriptionContext?.hasRemainingTrialMessages) {
        this.logger.debug(
          'Incrementing trial messages for non-subscription user',
          {
            orgId,
            userId,
          },
        );

        void this.incrementTrialMessagesUseCase.execute(
          new IncrementTrialMessagesCommand(orgId),
        );
      }

      // Execute run and stream events
      await this.executeRunAndStream({
        threadId: sendMessageDto.threadId,
        input: RunInputMapper.toCommand(sendMessageDto, uploadedFiles),
        userId,
        streaming: sendMessageDto.streaming ?? true,
        orgId,
        response,
      });

      // Close the connection
      response.end();
    } catch (error) {
      this.logger.error('Error in sendMessage', {
        userId,
        threadId: sendMessageDto.threadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Send error response for connection errors
      const errorResponse: RunErrorResponseDto = {
        type: 'error',
        message: 'Failed to process message',
        threadId: sendMessageDto.threadId,
        timestamp: new Date().toISOString(),
        code: 'CONNECTION_ERROR',
        details: {
          error: error instanceof Error ? error.toString() : 'Unknown error',
        },
      };

      this.writeSSEEvent(response, 'connection-error', errorResponse);
      response.end();
    }
  }

  private writeSSEEvent(response: Response, id: string, data: any): void {
    response.write(`id: ${id}\n`);
    response.write(`data: ${JSON.stringify(data)}\n`);
    response.write('\n'); // Double newline to separate events
  }

  private async executeRunAndStream(params: {
    threadId: UUID;
    input: RunInput;
    userId: UUID;
    streaming?: boolean;
    orgId: UUID;
    response: Response;
  }) {
    try {
      const command = new ExecuteRunAndSetTitleCommand({
        threadId: params.threadId,
        input: params.input,
        streaming: params.streaming,
      });

      const eventGenerator = this.executeRunAndSetTitleUseCase.execute(command);

      // Track if client disconnected
      let clientDisconnected = false;
      const disconnectHandler = () => {
        this.logger.log('Client disconnected from SSE stream', {
          threadId: params.threadId,
        });
        clientDisconnected = true;
      };

      // Listen for client disconnect
      params.response.on('close', disconnectHandler);

      try {
        for await (const event of eventGenerator) {
          // Check if client disconnected before writing
          if (clientDisconnected) {
            this.logger.log('Stopping event stream due to client disconnect');
            break;
          }

          // Generate appropriate event ID based on response type
          let eventId: string;
          switch (event.type) {
            case 'message':
              eventId = `message-${event.timestamp}`;
              break;
            case 'thread':
              eventId = `thread-${event.threadId}`;
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

          this.writeSSEEvent(params.response, eventId, event);
        }
      } finally {
        // Clean up disconnect listener
        params.response.off('close', disconnectHandler);
      }
    } catch (error) {
      this.logger.error('Error in executeRunAndStream', error);

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
          stack: error instanceof Error ? error.stack : undefined,
        },
      };

      this.writeSSEEvent(params.response, 'execution-error', errorResponse);
    }
  }
}
