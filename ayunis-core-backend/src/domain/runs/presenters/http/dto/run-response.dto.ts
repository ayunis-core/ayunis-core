import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  UserMessageResponseDto,
  AssistantMessageResponseDto,
  ToolResultMessageResponseDto,
  SystemMessageResponseDto,
} from '../../../../threads/presenters/http/dto/message-response.dto';

export class RunSessionResponseDto {
  @ApiProperty({
    description: 'Response type identifier',
    example: 'session',
    enum: ['session'],
    required: true,
  })
  type: 'session';

  @ApiPropertyOptional({
    description: 'Indicates successful session establishment',
    example: true,
    required: true,
  })
  success?: boolean;

  @ApiPropertyOptional({
    description: 'Indicates if the session is streaming',
    example: true,
    required: true,
  })
  streaming?: boolean;

  @ApiProperty({
    description: 'Thread ID for the session',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  threadId: string;

  @ApiProperty({
    description: 'Session establishment timestamp',
    example: '2024-01-01T12:00:00.000Z',
    required: true,
  })
  timestamp: string;
}

export class RunThreadResponseDto {
  @ApiProperty({
    description: 'Response type identifier',
    example: 'thread',
    enum: ['thread'],
    required: true,
  })
  type: 'thread';

  @ApiProperty({
    description: 'Thread ID that was updated',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  threadId: string;

  @ApiProperty({
    description: 'Type of thread update',
    example: 'title_updated',
    enum: ['title_updated'],
    required: true,
  })
  updateType: 'title_updated';

  @ApiProperty({
    description: 'Updated thread title',
    example: 'Discussion about AI and machine learning',
    required: true,
  })
  title: string;

  @ApiProperty({
    description: 'Thread update timestamp',
    example: '2024-01-01T12:00:00.000Z',
    required: true,
  })
  timestamp: string;
}

export class RunErrorResponseDto {
  @ApiProperty({
    description: 'Response type identifier',
    example: 'error',
    enum: ['error'],
    required: true,
  })
  type: 'error';

  @ApiProperty({
    description: 'Error message',
    example: 'An error occurred while processing your request',
    required: true,
  })
  message: string;

  @ApiProperty({
    description: 'Thread ID where the error occurred',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  threadId: string;

  @ApiProperty({
    description: 'Error timestamp',
    example: '2024-01-01T12:00:00.000Z',
    required: true,
  })
  timestamp: string;

  @ApiProperty({
    description: 'Optional error code for categorization',
    example: 'EXECUTION_ERROR',
    required: false,
  })
  code?: string;

  @ApiProperty({
    description: 'Optional additional error details',
    example: { originalError: 'Network timeout' },
    required: false,
  })
  details?: Record<string, any>;
}

export class RunMessageResponseDto {
  @ApiProperty({
    description: 'Response type identifier',
    example: 'message',
    enum: ['message'],
    required: true,
  })
  type: 'message';

  @ApiProperty({
    description: 'The message data',
    oneOf: [
      { $ref: getSchemaPath(UserMessageResponseDto) },
      { $ref: getSchemaPath(AssistantMessageResponseDto) },
      { $ref: getSchemaPath(ToolResultMessageResponseDto) },
      { $ref: getSchemaPath(SystemMessageResponseDto) },
    ],
    required: true,
  })
  message:
    | UserMessageResponseDto
    | AssistantMessageResponseDto
    | ToolResultMessageResponseDto
    | SystemMessageResponseDto;

  @ApiProperty({
    description: 'Thread ID for the message',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  threadId: string;

  @ApiProperty({
    description: 'Message timestamp',
    example: '2024-01-01T12:00:00.000Z',
    required: true,
  })
  timestamp: string;
}

export class RunHeartbeatResponseDto {
  @ApiProperty({
    description: 'Response type identifier',
    example: 'heartbeat',
    enum: ['heartbeat'],
    required: true,
  })
  type: 'heartbeat';

  @ApiProperty({
    description: 'Thread ID for the heartbeat',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  threadId: string;

  @ApiProperty({
    description: 'Heartbeat timestamp',
    example: '2024-01-01T12:00:00.000Z',
    required: true,
  })
  timestamp: string;

  @ApiPropertyOptional({
    description: 'Heartbeat sequence number for tracking',
    example: 1,
    required: false,
  })
  sequence?: number;
}

// Union type for TypeScript usage
export type RunResponse =
  | RunSessionResponseDto
  | RunMessageResponseDto
  | RunErrorResponseDto
  | RunThreadResponseDto
  | RunHeartbeatResponseDto;
