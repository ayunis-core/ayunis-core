import type { UUID } from 'crypto';
import { CreateSubscriptionCommand } from '../../application/use-cases/create-subscription/create-subscription.command';
import { ChangeSubscriptionCommand } from '../../application/use-cases/change-subscription/change-subscription.command';
import type { CreateSubscriptionRequestDto } from './dto/create-subscription-request.dto';
import type { ChangeSubscriptionRequestDto } from './dto/change-subscription-request.dto';
import type { BillingInfoFieldsDto } from './dto/billing-info-fields.dto';

function parseStartsAt(value?: string): Date | undefined {
  return value ? new Date(value) : undefined;
}

export function toBillingInfoParams(dto: BillingInfoFieldsDto) {
  return {
    companyName: dto.companyName,
    street: dto.street,
    houseNumber: dto.houseNumber,
    postalCode: dto.postalCode,
    city: dto.city,
    country: dto.country,
    vatNumber: dto.vatNumber,
  };
}

function toBillingFields(dto: CreateSubscriptionRequestDto) {
  return { ...toBillingInfoParams(dto), subText: dto.subText };
}

export function toCreateCommand(
  orgId: UUID,
  userId: UUID,
  dto: CreateSubscriptionRequestDto,
): CreateSubscriptionCommand {
  return new CreateSubscriptionCommand({
    orgId,
    requestingUserId: userId,
    ...toBillingFields(dto),
    type: dto.type,
    noOfSeats: dto.noOfSeats,
    monthlyCredits: dto.monthlyCredits,
    startsAt: parseStartsAt(dto.startsAt),
  });
}

export function toChangeCommand(
  orgId: UUID,
  userId: UUID,
  dto: ChangeSubscriptionRequestDto,
): ChangeSubscriptionCommand {
  return new ChangeSubscriptionCommand({
    orgId,
    requestingUserId: userId,
    ...toBillingFields(dto),
    disposition: dto.oldSubscriptionDisposition,
    type: dto.type,
    noOfSeats: dto.noOfSeats,
    monthlyCredits: dto.monthlyCredits,
    startsAt: parseStartsAt(dto.startsAt),
  });
}
