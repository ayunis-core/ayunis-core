import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
  type: 'text' = 'text';

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
  type: 'tool_result' = 'tool_result';

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
@ApiExtraModels(TextInput, ToolResultInput)
export class SendMessageDto {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({
    description: 'The thread to use for the inference.',
    example: '550e8400-e29b-12d3-a456-426614174000',
  })
  threadId: UUID;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Object, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: TextInput, name: 'text' },
        { value: ToolResultInput, name: 'tool_result' },
      ],
    },
  })
  @ApiProperty({
    description: 'The input to use for the inference',
    discriminator: {
      propertyName: 'type',
    },
    oneOf: [
      { $ref: getSchemaPath(TextInput) },
      { $ref: getSchemaPath(ToolResultInput) },
    ],
  })
  input: TextInput | ToolResultInput;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: 'Enable streaming mode for real-time response updates',
    type: 'boolean',
    example: true,
    required: false,
    default: false,
  })
  streaming?: boolean;
}
