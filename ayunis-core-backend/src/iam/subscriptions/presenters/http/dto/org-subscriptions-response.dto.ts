import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionLifecycleStatus } from 'src/iam/subscriptions/domain/value-objects/subscription-lifecycle-status.enum';
import { SubscriptionResponseDto } from './subscription-response.dto';

export class OrgSubscriptionHistoryItemDto extends SubscriptionResponseDto {
  @ApiProperty({
    description: 'Lifecycle status of this subscription record',
    enum: SubscriptionLifecycleStatus,
    example: SubscriptionLifecycleStatus.ACTIVE,
  })
  status: SubscriptionLifecycleStatus;

  @ApiProperty({
    description: 'Whether this is the newest subscription for the organization',
    example: true,
  })
  isLatest: boolean;
}

export class OrgSubscriptionsResponseDto {
  @ApiProperty({
    description:
      'All subscriptions belonging to the organization, newest first',
    type: [OrgSubscriptionHistoryItemDto],
  })
  subscriptions: OrgSubscriptionHistoryItemDto[];

  @ApiProperty({
    description:
      'How many subscriptions are currently serving access (including cancelled seat-based records still inside their paid period)',
    example: 1,
  })
  activeCount: number;
}
