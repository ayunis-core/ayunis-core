import { ApiProperty } from '@nestjs/swagger';

export class FeatureTogglesResponseDto {
  @ApiProperty({
    description: 'Cloud subscriptions are managed externally',
    default: false,
  })
  externalSubscriptionsEnabled: boolean;

  @ApiProperty({
    description: 'Users can create routines that run on their behalf',
    default: false,
  })
  routinesEnabled: boolean;
}
