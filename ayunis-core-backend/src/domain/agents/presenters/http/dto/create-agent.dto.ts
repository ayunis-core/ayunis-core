import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Length,
  IsUUID,
  IsArray,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { UUID } from 'crypto';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

export class ToolAssignmentDto {
  @ApiProperty({
    description: 'The type of tool to assign',
    example: ToolType.INTERNET_SEARCH,
    enum: ToolType,
  })
  @IsEnum(ToolType)
  @IsNotEmpty()
  type: ToolType;

  @ApiProperty({
    description: 'The ID of the tool configuration to assign',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  toolConfigId?: UUID;
}

export class CreateAgentDto {
  @ApiProperty({
    description: 'The name of the agent',
    example: 'Customer Support Assistant',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    description: 'The instructions for the agent',
    example:
      'You are a helpful customer support assistant. Always be polite and professional.',
  })
  @IsString()
  @IsNotEmpty()
  instructions: string;

  @ApiProperty({
    description: 'The ID of the permitted model to use for this agent',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  modelId: UUID;

  @ApiProperty({
    description: 'The tools to assign to the agent',
    type: [ToolAssignmentDto],
  })
  @IsArray()
  @IsNotEmpty()
  toolAssignments: ToolAssignmentDto[];
}
