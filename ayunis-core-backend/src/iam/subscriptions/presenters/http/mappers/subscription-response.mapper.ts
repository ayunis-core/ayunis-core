import { Injectable } from '@nestjs/common';
import { Subscription } from '../../../domain/subscription.entity';
import {
  isSeatBased,
  isUsageBased,
} from '../../../domain/subscription-type-guards';
import { SubscriptionResponseDto } from '../dto/subscription-response.dto';

@Injectable()
export class SubscriptionResponseMapper {
  toDto(data: {
    subscription: Subscription;
    availableSeats: number | null;
    nextRenewalDate: Date;
  }): SubscriptionResponseDto {
    const { subscription, availableSeats, nextRenewalDate } = data;

    const dto: SubscriptionResponseDto = {
      id: subscription.id,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      cancelledAt: subscription.cancelledAt,
      orgId: subscription.orgId,
      type: subscription.type,
      nextRenewalDate,
      billingInfo: {
        companyName: subscription.billingInfo.companyName,
        street: subscription.billingInfo.street,
        houseNumber: subscription.billingInfo.houseNumber,
        city: subscription.billingInfo.city,
        postalCode: subscription.billingInfo.postalCode,
        country: subscription.billingInfo.country,
        vatNumber: subscription.billingInfo.vatNumber,
      },
    };

    if (isSeatBased(subscription)) {
      dto.noOfSeats = subscription.noOfSeats;
      dto.pricePerSeat = subscription.pricePerSeat;
      dto.renewalCycle = subscription.renewalCycle;
      dto.renewalCycleAnchor = subscription.renewalCycleAnchor;
      dto.availableSeats = availableSeats;
    }

    if (isUsageBased(subscription)) {
      dto.monthlyCredits = subscription.monthlyCredits;
    }

    return dto;
  }
}
