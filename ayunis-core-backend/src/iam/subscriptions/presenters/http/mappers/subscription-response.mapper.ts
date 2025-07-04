import { Injectable } from '@nestjs/common';
import { Subscription } from '../../../domain/subscription.entity';
import { SubscriptionResponseDto } from '../dto/subscription-response.dto';

@Injectable()
export class SubscriptionResponseMapper {
  toDto(data: {
    subscription: Subscription;
    availableSeats: number;
    nextRenewalDate: Date;
  }): SubscriptionResponseDto {
    const { subscription, availableSeats, nextRenewalDate } = data;

    return {
      id: subscription.id,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      cancelledAt: subscription.cancelledAt,
      orgId: subscription.orgId,
      noOfSeats: subscription.noOfSeats,
      pricePerSeat: subscription.pricePerSeat,
      renewalCycle: subscription.renewalCycle,
      renewalCycleAnchor: subscription.renewalCycleAnchor,
      availableSeats,
      nextRenewalDate,
    };
  }
}
