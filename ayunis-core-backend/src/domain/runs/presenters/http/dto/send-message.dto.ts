import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  ValidateNested,
  IsBoolean,
  IsString,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
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
@ApiExtraModels(TextInput, ToolResultInput)
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
  @Transform(({ value }: { value: unknown }): string[] | undefined =>
    typeof value === 'string'
      ? (JSON.parse(value) as string[])
      : (value as string[] | undefined),
  )
  @ApiProperty({
    description:
      'JSON array of alt texts matching the order of uploaded images',
    type: 'array',
    items: { type: 'string' },
    required: false,
  })
  imageAltTexts?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => Object, {
    discriminator: {
      property: 'type',
      subTypes: [{ value: ToolResultInput, name: 'tool_result' }],
    },
  })
  @Transform(({ value }: { value: unknown }): ToolResultInput | undefined =>
    typeof value === 'string'
      ? (JSON.parse(value) as ToolResultInput)
      : (value as ToolResultInput | undefined),
  )
  @ApiProperty({
    description: 'Tool result input (for tool_result type only)',
    oneOf: [{ $ref: getSchemaPath(ToolResultInput) }],
    required: false,
  })
  toolResult?: ToolResultInput;

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
