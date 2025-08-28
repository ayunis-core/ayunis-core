import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';

export class AgentSourceResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the source assignment',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  id: UUID;

  @ApiProperty({
    description: 'The unique identifier of the source',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  sourceId: UUID;

  @ApiProperty({
    description: 'The name of the source',
    example: 'Project Documentation',
  })
  name: string;

  @ApiProperty({
    description: 'The type of source',
    example: 'file',
    enum: ['file', 'url'],
  })
  type: string;
}
