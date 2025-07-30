import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Length,
  IsUUID,
  ValidateNested,
  IsArray,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { UUID } from 'crypto';
import { Type } from 'class-transformer';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

class ToolAssignmentDto {
  @ApiProperty({
    description: 'The ID of the tool assignment',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  id?: UUID;

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
  @IsUUID()
  @IsOptional()
  toolConfigId?: UUID;

  @ApiProperty({
    description: 'Whether the tool is enabled',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isEnabled: boolean;
}

export class UpdateAgentDto {
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
    description: 'The tool assignments for the agent',
    type: [ToolAssignmentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToolAssignmentDto)
  toolAssignments: ToolAssignmentDto[];
}
