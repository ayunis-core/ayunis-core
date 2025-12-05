import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  ArrayNotEmpty,
  IsString,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

export class ToolSpecificationDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The name of the tool',
    example: 'weather_tool',
  })
  name: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The description of what the tool does',
    example: 'Get current weather information for a location',
  })
  description: string;

  @IsObject()
  @ApiProperty({
    description: 'The JSON schema for the tool parameters',
    example: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city or location to get weather for',
        },
      },
      required: ['location'],
    },
  })
  parameters: Record<string, any>;
}

// Message content DTOs for requests
export class MessageContentRequestDto {
  @IsEnum(MessageContentType)
  @ApiProperty({
    description: 'Type of the message content',
    enum: MessageContentType,
  })
  type: MessageContentType;
}

export class TextMessageContentRequestDto extends MessageContentRequestDto {
  @ApiProperty({
    description: 'Type of the message content',
    example: MessageContentType.TEXT,
    enum: [MessageContentType.TEXT],
  })
  type: MessageContentType.TEXT = MessageContentType.TEXT;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The text content of the message',
    example: 'Hello, how can I help you today?',
  })
  text: string;
}

export class ImageMessageContentRequestDto extends MessageContentRequestDto {
  @ApiProperty({
    description: 'Type of the message content',
    example: MessageContentType.IMAGE,
    enum: [MessageContentType.IMAGE],
  })
  type: MessageContentType.IMAGE = MessageContentType.IMAGE;

  @IsNotEmpty()
  @IsInt()
  @ApiProperty({
    description: 'Index of the image in the message (0-based)',
    example: 0,
  })
  index: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'MIME type of the image',
    example: 'image/jpeg',
  })
  contentType: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Optional alternative text for the image',
    example: 'Screenshot of the reported issue',
    required: false,
  })
  altText?: string;
}

export class ToolUseMessageContentRequestDto extends MessageContentRequestDto {
  @ApiProperty({
    description: 'Type of the message content',
    example: MessageContentType.TOOL_USE,
    enum: [MessageContentType.TOOL_USE],
  })
  type: MessageContentType.TOOL_USE = MessageContentType.TOOL_USE;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Unique identifier for the tool call',
    example: 'call_abc123',
  })
  id: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Name of the tool being used',
    example: 'get_weather',
  })
  name: string;

  @IsObject()
  @ApiProperty({
    description: 'Parameters passed to the tool',
    example: { location: 'New York', unit: 'celsius' },
  })
  params: Record<string, any>;
}

export class ToolResultMessageContentRequestDto extends MessageContentRequestDto {
  @ApiProperty({
    description: 'Type of the message content',
    example: MessageContentType.TOOL_RESULT,
    enum: [MessageContentType.TOOL_RESULT],
  })
  type: MessageContentType.TOOL_RESULT = MessageContentType.TOOL_RESULT;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Identifier of the tool call this result belongs to',
    example: 'call_abc123',
  })
  toolId: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Name of the tool that generated this result',
    example: 'get_weather',
  })
  toolName: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The result returned by the tool',
    example:
      'The current temperature in New York is 22°C with partly cloudy skies.',
  })
  result: string;
}

// Message request DTOs
export class UserMessageRequestDto {
  @ApiProperty({
    description: 'Role of the message sender',
    example: MessageRole.USER,
    enum: [MessageRole.USER],
  })
  role: MessageRole.USER = MessageRole.USER;

  @ValidateNested({ each: true })
  @Type(() => Object, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: TextMessageContentRequestDto, name: MessageContentType.TEXT },
        {
          value: ImageMessageContentRequestDto,
          name: MessageContentType.IMAGE,
        },
      ],
    },
  })
  @ApiProperty({
    description:
      'Array of content items for user messages (text and/or images)',
    oneOf: [
      { $ref: getSchemaPath(TextMessageContentRequestDto) },
      { $ref: getSchemaPath(ImageMessageContentRequestDto) },
    ],
  })
  content: Array<TextMessageContentRequestDto | ImageMessageContentRequestDto>;
}

export class SystemMessageRequestDto {
  @ApiProperty({
    description: 'Role of the message sender',
    example: MessageRole.SYSTEM,
    enum: [MessageRole.SYSTEM],
  })
  role: MessageRole.SYSTEM = MessageRole.SYSTEM;

  @ValidateNested({ each: true })
  @Type(() => TextMessageContentRequestDto)
  @ApiProperty({
    description: 'Array of text content items for system messages',
    type: [TextMessageContentRequestDto],
  })
  content: TextMessageContentRequestDto[];
}

export class AssistantMessageRequestDto {
  @ApiProperty({
    description: 'Role of the message sender',
    example: MessageRole.ASSISTANT,
    enum: [MessageRole.ASSISTANT],
  })
  role: MessageRole.ASSISTANT = MessageRole.ASSISTANT;

  @ValidateNested({ each: true })
  @Type(() => Object, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: TextMessageContentRequestDto, name: MessageContentType.TEXT },
        {
          value: ToolUseMessageContentRequestDto,
          name: MessageContentType.TOOL_USE,
        },
      ],
    },
  })
  @ApiProperty({
    description:
      'Array of content items for assistant messages (text or tool use)',
    oneOf: [
      { $ref: getSchemaPath(TextMessageContentRequestDto) },
      { $ref: getSchemaPath(ToolUseMessageContentRequestDto) },
    ],
  })
  content: Array<
    TextMessageContentRequestDto | ToolUseMessageContentRequestDto
  >;
}

export class ToolResultMessageRequestDto {
  @ApiProperty({
    description: 'Role of the message sender',
    example: MessageRole.TOOL,
    enum: [MessageRole.TOOL],
  })
  role: MessageRole.TOOL = MessageRole.TOOL;

  @ValidateNested({ each: true })
  @Type(() => ToolResultMessageContentRequestDto)
  @ApiProperty({
    description: 'Array of tool result content items for tool messages',
    type: [ToolResultMessageContentRequestDto],
  })
  content: ToolResultMessageContentRequestDto[];
}

// Union type for all message requests
export type MessageRequestDto =
  | UserMessageRequestDto
  | SystemMessageRequestDto
  | AssistantMessageRequestDto
  | ToolResultMessageRequestDto;

export class InferenceRequestDto {
  @IsNotEmpty()
  @ApiProperty({
    description: 'The name of the model to use for the inference',
    example: 'mistral-large-latest',
  })
  modelName: string;

  @IsEnum(ModelProvider)
  @IsNotEmpty()
  @ApiProperty({
    description: 'The provider of the model to use for the inference',
    example: ModelProvider.MISTRAL,
    enum: ModelProvider,
  })
  modelProvider: ModelProvider;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The instructions to use for the inference',
    example: 'You are a helpful AI assistant.',
  })
  instructions?: string;

  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => Object, {
    discriminator: {
      property: 'role',
      subTypes: [
        { value: UserMessageRequestDto, name: MessageRole.USER },
        { value: SystemMessageRequestDto, name: MessageRole.SYSTEM },
        { value: AssistantMessageRequestDto, name: MessageRole.ASSISTANT },
        { value: ToolResultMessageRequestDto, name: MessageRole.TOOL },
      ],
    },
  })
  @ApiProperty({
    description: 'The messages to use for the inference',
    type: 'array',
    items: {
      oneOf: [
        { $ref: getSchemaPath(UserMessageRequestDto) },
        { $ref: getSchemaPath(SystemMessageRequestDto) },
        { $ref: getSchemaPath(AssistantMessageRequestDto) },
        { $ref: getSchemaPath(ToolResultMessageRequestDto) },
      ],
    },
  })
  messages: MessageRequestDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ToolSpecificationDto)
  @ApiProperty({
    description:
      'The tool specifications to create custom tools for the inference',
    example: [
      {
        name: 'weather_tool',
        description: 'Get current weather information for a location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'The city or location to get weather for',
            },
          },
          required: ['location'],
        },
      },
    ],
    type: [ToolSpecificationDto],
    required: false,
  })
  tools?: ToolSpecificationDto[];

  @IsOptional()
  @IsEnum(ModelToolChoice)
  @ApiProperty({
    description: 'The tool choice to use for the inference',
    example: ModelToolChoice.AUTO,
    enum: ModelToolChoice,
    required: false,
  })
  toolChoice?: ModelToolChoice;
}
