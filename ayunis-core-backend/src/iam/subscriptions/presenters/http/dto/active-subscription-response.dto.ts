import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionType } from '../../../domain/value-objects/subscription-type.enum';

export class ActiveSubscriptionResponseDto {
  @ApiProperty({
    description: 'Whether the organization has an active subscription',
    example: true,
  })
  hasActiveSubscription: boolean;

  @ApiPropertyOptional({
    description:
      'Type of the active subscription. Null when there is no active subscription or on self-hosted deployments.',
    enum: SubscriptionType,
    example: SubscriptionType.SEAT_BASED,
  })
  subscriptionType?: SubscriptionType | null;
}
