import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { RenewalCycle } from '../../../domain/value-objects/renewal-cycle.enum';

export class SubscriptionResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the subscription',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: UUID;

  @ApiProperty({
    description: 'Date when the subscription was created',
    example: '2023-12-01T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the subscription was last updated',
    example: '2023-12-01T10:00:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Date when the subscription was cancelled (if applicable)',
    example: '2023-12-15T10:00:00Z',
    required: false,
  })
  cancelledAt: Date | null;

  @ApiProperty({
    description: 'Organization ID associated with the subscription',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  orgId: UUID;

  @ApiProperty({
    description: 'Number of seats in the subscription',
    example: 10,
  })
  noOfSeats: number;

  @ApiProperty({
    description: 'Price per seat in the subscription',
    example: 29.99,
  })
  pricePerSeat: number;

  @ApiProperty({
    description: 'Renewal cycle of the subscription',
    enum: RenewalCycle,
    example: RenewalCycle.MONTHLY,
  })
  renewalCycle: RenewalCycle;

  @ApiProperty({
    description: 'Date that serves as the anchor for renewal cycles',
    example: '2023-12-01T10:00:00Z',
  })
  renewalCycleAnchor: Date;

  @ApiProperty({
    description: 'Number of available seats (total seats minus invites)',
    example: 3,
  })
  availableSeats: number;

  @ApiProperty({
    description: 'Date of the next renewal',
    example: '2024-01-01T10:00:00Z',
  })
  nextRenewalDate: Date;
}
