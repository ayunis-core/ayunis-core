import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

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
}
