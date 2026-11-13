import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  ValidateNested,
  IsBoolean,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { Type, Transform, plainToInstance } from 'class-transformer';
import { UUID } from 'crypto';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

class Input {
  @ApiProperty({
    description: 'The type of input',
    enum: ['text', 'tool_result'],
  })
  @IsEnum(['text', 'tool_result'])
  type: 'text' | 'tool_result';
}

export class TextInput extends Input {
  @ApiProperty({
    description: 'The type of input',
    enum: ['text'],
    example: 'text',
  })
  type: 'text' = 'text' as const;

  @ApiProperty({
    description: 'The text content for the inference',
    example: 'What is the weather forecast for New York tomorrow?',
  })
  @IsNotEmpty()
  text: string;
}

export class ToolResultInput extends Input {
  @ApiProperty({
    description: 'The type of input',
    enum: ['tool_result'],
    example: 'tool_result',
  })
  type: 'tool_result' = 'tool_result' as const;

  @ApiProperty({
    description: 'The ID of the tool that produced this result',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  toolId: string;

  @ApiProperty({
    description: 'The name of the tool that produced this result',
    example: 'weather_tool',
  })
  @IsNotEmpty()
  toolName: string;

  @ApiProperty({
    description: 'The result data from the tool execution',
    example:
      '{"location":"New York","forecast":"Partly cloudy with a high of 75°F and a low of 60°F","precipitation":"20%"}',
  })
  @IsNotEmpty()
  result: string;
}

export class ToolCallDecisionDto {
  @ApiProperty({
    description: 'ID of a tool call awaiting confirmation',
    example: 'call_abc123',
  })
  @IsString()
  @IsNotEmpty()
  toolCallId: string;

  @ApiProperty({
    description: 'Whether the user confirmed (true) or rejected (false) it',
    example: true,
  })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({
    description:
      'Always allow this tool of this integration for the user; only applied to a confirmed call',
    example: false,
  })
  @IsBoolean()
  alwaysAllow: boolean;
}

export class ToolConfigDto {
  @IsEnum(ToolType)
  @ApiProperty({
    description: 'The type of tool to use',
    enum: ToolType,
    example: ToolType.HTTP,
  })
  toolType: ToolType;

  @IsOptional()
  @IsUUID()
  @ApiProperty({
    description:
      'The configuration ID for the tool (required for some tool types)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  toolConfigId?: UUID;
}

/**
 * DTO for sending messages with optional file uploads via multipart/form-data.
 *
 * For user messages with images:
 * - Send as multipart/form-data
 * - Include files in 'images' field
 * - Include JSON fields as form fields
 *
 * For tool results (no files):
 * - Can send as application/json or multipart/form-data
 */
@ApiExtraModels(TextInput, ToolResultInput, ToolCallDecisionDto)
export class SendMessageDto {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({
    description: 'The thread to use for the inference.',
    example: '550e8400-e29b-12d3-a456-426614174000',
  })
  threadId: UUID;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Text content of the user message (for user input)',
    example: 'What do you see in this image?',
    required: false,
  })
  text?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }: { value: unknown }): string[] | undefined => {
    if (typeof value !== 'string') {
      return value as string[] | undefined;
    }
    try {
      return JSON.parse(value) as string[];
    } catch {
      // Return undefined - validation decorators will handle the error
      return undefined;
    }
  })
  @ApiProperty({
    description:
      'JSON array of alt texts matching the order of uploaded images',
    type: 'array',
    items: { type: 'string' },
    required: false,
  })
  imageAltTexts?: string[];

  @IsOptional()
  // ValidateNested walks a list element by element, so without IsObject a
  // posted list passes here and only fails deeper in, with no tool id.
  @IsObject()
  @ValidateNested()
  @Type(() => ToolResultInput)
  // Multipart sends the tool result as a JSON string. A plain parsed object
  // would lose every field to the whitelist, so it becomes an instance here.
  @Transform(({ value }: { value: unknown }): unknown => {
    if (typeof value !== 'string') return value;
    try {
      return plainToInstance(ToolResultInput, JSON.parse(value) as unknown);
    } catch {
      return value;
    }
  })
  @ApiProperty({
    description: 'Tool result input (for tool_result type only)',
    oneOf: [{ $ref: getSchemaPath(ToolResultInput) }],
    required: false,
  })
  toolResult?: ToolResultInput;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ToolCallDecisionDto)
  // Multipart sends the decisions as a JSON string.
  @Transform(({ value }: { value: unknown }): unknown => {
    if (typeof value !== 'string') return value;
    try {
      return plainToInstance(ToolCallDecisionDto, JSON.parse(value) as unknown);
    } catch {
      return value;
    }
  })
  @ApiProperty({
    description:
      'Decisions on every tool call awaiting confirmation in the last assistant turn; excludes all other inputs',
    type: [ToolCallDecisionDto],
    required: false,
  })
  decisions?: ToolCallDecisionDto[];

  @IsOptional()
  @IsUUID()
  @ApiProperty({
    description:
      'Skill ID to activate for this message — injects skill instructions and resources into the thread',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  skillId?: UUID;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @ApiProperty({
    description: 'Enable streaming mode for real-time response updates',
    type: 'boolean',
    example: true,
    required: false,
    default: true,
  })
  streaming?: boolean;
}
