import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';

export class TrialStatusDto {
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'Trial unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: UUID;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'Date when the trial was created',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'Date when the trial was last updated',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'Organization ID associated with the trial',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orgId: UUID;

  @ApiProperty({
    type: 'number',
    description: 'Number of messages sent during the trial',
    example: 50,
  })
  messagesSent: number;

  @ApiProperty({
    type: 'number',
    description: 'Maximum number of messages allowed in the trial',
    example: 100,
  })
  maxMessages: number;
}

export class SubscriptionStatusResponseDto {
  @ApiProperty({
    type: 'boolean',
    description: 'Whether the organization has an active subscription',
    example: false,
  })
  hasActiveSubscription!: boolean;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the message limit has been reached',
    example: false,
  })
  isMessageLimitReached!: boolean;

  @ApiProperty({
    type: TrialStatusDto,
    required: false,
    nullable: true,
    description: 'Trial information if no active subscription exists',
  })
  trial?: TrialStatusDto | null;
}
