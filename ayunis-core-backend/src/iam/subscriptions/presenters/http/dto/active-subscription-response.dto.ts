import { ApiProperty } from '@nestjs/swagger';

export class ActiveSubscriptionResponseDto {
  @ApiProperty({
    description: 'Whether the organization has an active subscription',
    example: true,
  })
  hasActiveSubscription: boolean;
}
