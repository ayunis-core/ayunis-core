import { ApiProperty } from '@nestjs/swagger';

export class FeatureTogglesResponseDto {
  @ApiProperty({
    description: 'Cloud subscriptions are managed externally',
    default: false,
  })
  externalSubscriptionsEnabled: boolean;
}
