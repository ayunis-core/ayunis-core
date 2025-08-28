import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AgentSourceResponseDto } from './agent-source-assignment-response.dto';

export class ModelResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the model',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  id: UUID;

  @ApiProperty({
    description: 'The name of the model',
    example: 'gpt-4',
  })
  name: string;

  @ApiProperty({
    description: 'The provider of the model',
    example: 'openai',
  })
  provider: string;

  @ApiProperty({
    description: 'The display name of the model',
    example: 'GPT-4',
  })
  displayName: string;
}

export class ToolResponseDto {
  @ApiProperty({
    description: 'The type of the tool',
    example: 'internet_search',
    enum: ToolType,
  })
  type: ToolType;
}

export class AgentResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the agent',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  id: UUID;

  @ApiProperty({
    description: 'The name of the agent',
    example: 'Customer Support Assistant',
  })
  name: string;

  @ApiProperty({
    description: 'The instructions for the agent',
    example:
      'You are a helpful customer support assistant. Always be polite and professional.',
  })
  instructions: string;

  @ApiProperty({
    description: 'The unique identifier of the user who owns this agent',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  userId: UUID;

  @ApiProperty({
    description: 'The date and time when the agent was created',
    example: '2023-12-01T10:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date and time when the agent was last updated',
    example: '2023-12-01T10:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'The model configuration for this agent',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'gpt-4',
      provider: 'openai',
    },
  })
  model: ModelResponseDto;

  @ApiProperty({
    description: 'The tools assigned to this agent',
    type: [ToolResponseDto],
  })
  tools: ToolResponseDto[];

  @ApiProperty({
    description: 'The sources assigned to this agent',
    type: [AgentSourceResponseDto],
  })
  sources: AgentSourceResponseDto[];
}
