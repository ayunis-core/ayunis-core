import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';

export class SuperAdminTrialResponseDto {
  @ApiProperty({
    description: 'Trial unique identifier',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: UUID;

  @ApiProperty({
    description: 'Organization ID associated with this trial',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orgId: UUID;

  @ApiProperty({
    description: 'Number of messages sent in this trial',
    example: 150,
    minimum: 0,
  })
  messagesSent: number;

  @ApiProperty({
    description: 'Maximum number of messages allowed in this trial',
    example: 1000,
    minimum: 1,
  })
  maxMessages: number;

  @ApiProperty({
    description: 'Date when the trial was created',
    example: '2024-01-15T10:30:00Z',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the trial was last updated',
    example: '2024-01-15T10:30:00Z',
    type: Date,
  })
  updatedAt: Date;
}

export class SuperAdminTrialResponseDtoNullable {
  @ApiProperty({
    description: 'Trial',
    type: SuperAdminTrialResponseDto,
    required: false,
  })
  trial?: SuperAdminTrialResponseDto;
}
