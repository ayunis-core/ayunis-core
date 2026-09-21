import { Injectable } from '@nestjs/common';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import {
  isSeatBased,
  isUsageBased,
} from 'src/iam/subscriptions/domain/subscription-type-guards';
import type { ListOrgSubscriptionsResult } from 'src/iam/subscriptions/application/use-cases/list-org-subscriptions/list-org-subscriptions.use-case';
import { SubscriptionResponseDto } from 'src/iam/subscriptions/presenters/http/dto/subscription-response.dto';
import {
  OrgSubscriptionHistoryItemDto,
  OrgSubscriptionsResponseDto,
} from 'src/iam/subscriptions/presenters/http/dto/org-subscriptions-response.dto';

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
      startsAt: subscription.startsAt,
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

  toHistoryResponse(
    result: ListOrgSubscriptionsResult,
  ): OrgSubscriptionsResponseDto {
    return {
      subscriptions: result.subscriptions.map((item) =>
        this.toHistoryItemDto(item),
      ),
      activeCount: result.activeCount,
    };
  }

  private toHistoryItemDto(item: {
    subscription: Subscription;
    status: OrgSubscriptionHistoryItemDto['status'];
    isLatest: boolean;
    nextRenewalDate: Date;
  }): OrgSubscriptionHistoryItemDto {
    return {
      ...this.toDto({
        subscription: item.subscription,
        availableSeats: null,
        nextRenewalDate: item.nextRenewalDate,
      }),
      status: item.status,
      isLatest: item.isLatest,
    };
  }
}
