import { ApiProperty } from '@nestjs/swagger';

export class FeatureTogglesResponseDto {
  @ApiProperty({
    description: 'Cloud subscriptions are managed in Fynn',
    default: false,
  })
  fynnManagedSubscriptionsEnabled: boolean;
}
