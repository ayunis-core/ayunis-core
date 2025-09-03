import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';

export class MessageContentResponseDto {
  @ApiProperty({
    description: 'Type of the message content',
    example: MessageContentType.TEXT,
    enum: MessageContentType,
  })
  type: MessageContentType;
}

export class TextMessageContentResponseDto extends MessageContentResponseDto {
  @ApiProperty({
    description: 'The text content of the message',
    example: 'Hello, how can I help you today?',
  })
  text: string;
}

export class ToolUseMessageContentResponseDto extends MessageContentResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the tool call',
    example: 'call_abc123',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the tool being used',
    example: 'get_weather',
  })
  name: string;

  @ApiProperty({
    description: 'Parameters passed to the tool',
    example: { location: 'New York', unit: 'celsius' },
  })
  params: Record<string, any>;
}

export class ToolResultMessageContentResponseDto extends MessageContentResponseDto {
  @ApiProperty({
    description: 'Identifier of the tool call this result belongs to',
    example: 'call_abc123',
  })
  toolId: string;

  @ApiProperty({
    description: 'Name of the tool that generated this result',
    example: 'get_weather',
  })
  toolName: string;

  @ApiProperty({
    description: 'The result returned by the tool',
    example:
      'The current temperature in New York is 22°C with partly cloudy skies.',
  })
  result: string;
}

export class ThinkingMessageContentResponseDto extends MessageContentResponseDto {
  @ApiProperty({
    description: 'The thinking content of the message',
    example: 'I am thinking about the best way to help you.',
  })
  thinking: string;
}

// Base message response class
abstract class BaseMessageResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the message',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Thread ID this message belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  threadId: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  createdAt: string;
}

// Role-specific message DTOs
export class UserMessageResponseDto extends BaseMessageResponseDto {
  @ApiProperty({
    description: 'Role of the message sender',
    example: MessageRole.USER,
    enum: [MessageRole.USER],
  })
  declare role: MessageRole.USER;

  @ApiProperty({
    description: 'Array of text content items for user messages',
    type: 'array',
    items: {
      $ref: getSchemaPath(TextMessageContentResponseDto),
    },
  })
  content: TextMessageContentResponseDto[];
}

export class SystemMessageResponseDto extends BaseMessageResponseDto {
  @ApiProperty({
    description: 'Role of the message sender',
    example: MessageRole.SYSTEM,
    enum: [MessageRole.SYSTEM],
  })
  declare role: MessageRole.SYSTEM;

  @ApiProperty({
    description: 'Array of text content items for system messages',
    type: 'array',
    items: {
      $ref: getSchemaPath(TextMessageContentResponseDto),
    },
  })
  content: TextMessageContentResponseDto[];
}

export class AssistantMessageResponseDto extends BaseMessageResponseDto {
  @ApiProperty({
    description: 'Role of the message sender',
    example: MessageRole.ASSISTANT,
    enum: [MessageRole.ASSISTANT],
  })
  declare role: MessageRole.ASSISTANT;

  @ApiProperty({
    description:
      'Array of content items for assistant messages (text or tool use)',
    type: 'array',
    items: {
      oneOf: [
        { $ref: getSchemaPath(TextMessageContentResponseDto) },
        { $ref: getSchemaPath(ToolUseMessageContentResponseDto) },
        { $ref: getSchemaPath(ThinkingMessageContentResponseDto) },
      ],
    },
  })
  content: Array<
    | TextMessageContentResponseDto
    | ToolUseMessageContentResponseDto
    | ThinkingMessageContentResponseDto
  >;
}

export class ToolResultMessageResponseDto extends BaseMessageResponseDto {
  @ApiProperty({
    description: 'Role of the message sender',
    example: MessageRole.TOOL,
    enum: [MessageRole.TOOL],
  })
  declare role: MessageRole.TOOL;

  @ApiProperty({
    description: 'Array of tool result content items for tool messages',
    type: 'array',
    items: {
      $ref: getSchemaPath(ToolResultMessageContentResponseDto),
    },
  })
  content: ToolResultMessageContentResponseDto[];
}

// Union type for all message responses
export type MessageResponseDto =
  | UserMessageResponseDto
  | SystemMessageResponseDto
  | AssistantMessageResponseDto
  | ToolResultMessageResponseDto;
