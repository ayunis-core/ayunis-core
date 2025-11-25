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
import { Type } from 'class-transformer';
import { UUID } from 'crypto';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

class Input {
  @ApiProperty({
    description: 'The type of input',
    enum: ['text', 'image', 'tool_result'],
  })
  @IsEnum(['text', 'image', 'tool_result'])
  type: 'text' | 'image' | 'tool_result';
}

export class MessageImageInputDto {
  @ApiProperty({
    description:
      'Internal image reference (e.g. MinIO object name or /storage/:objectName path)',
    example: '1711365678123-user-upload.png',
  })
  @IsNotEmpty()
  @IsString()
  imageUrl: string;

  @ApiProperty({
    description: 'Optional alternative text for the image',
    example: 'Screenshot of the reported issue',
    required: false,
  })
  @IsOptional()
  @IsString()
  altText?: string;
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

export class ImageInput extends Input {
  @ApiProperty({
    description: 'The type of input',
    enum: ['image'],
    example: 'image',
  })
  type: 'image' = 'image' as const;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageImageInputDto)
  @ApiProperty({
    description: 'Images to send, referenced by storage object name',
    type: 'array',
    items: { $ref: getSchemaPath(MessageImageInputDto) },
  })
  images: MessageImageInputDto[];
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
@ApiExtraModels(MessageImageInputDto, TextInput, ImageInput, ToolResultInput)
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
        { value: ImageInput, name: 'image' },
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
      { $ref: getSchemaPath(ImageInput) },
      { $ref: getSchemaPath(ToolResultInput) },
    ],
  })
  input: TextInput | ImageInput | ToolResultInput;

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
