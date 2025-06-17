import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';

export class PromptResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the prompt',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  id: UUID;

  @ApiProperty({
    description: 'The title of the prompt',
    example: 'Project Planning Assistant',
  })
  title: string;

  @ApiProperty({
    description: 'The content of the prompt',
    example:
      'You are a helpful assistant that helps with project planning. Please provide detailed step-by-step guidance for managing projects effectively.',
  })
  content: string;

  @ApiProperty({
    description: 'The unique identifier of the user who owns this prompt',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  userId: UUID;

  @ApiProperty({
    description: 'The date and time when the prompt was created',
    example: '2023-12-01T10:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date and time when the prompt was last updated',
    example: '2023-12-01T10:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: Date;
}
