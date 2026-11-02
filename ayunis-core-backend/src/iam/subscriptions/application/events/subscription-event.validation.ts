import type { UUID } from 'crypto';
import {
  Equals,
  IsDefined,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { IsFiniteDate } from 'src/common/validators/is-finite-date.validator';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import type {
  BillingInfoEventData,
  SeatBasedSubscriptionEventData,
  SubscriptionEventData,
  UsageBasedSubscriptionEventData,
} from './subscription-event-data.types';

class SubscriptionEventDataShape {
  @IsUUID() id!: UUID;
  @IsUUID() orgId!: UUID;
  @IsEnum(SubscriptionType) type!: SubscriptionType;
  @ValidateIf((data: SubscriptionEventDataShape) => data.cancelledAt !== null)
  @IsFiniteDate()
  cancelledAt!: Date | null;
  @ValidateIf((data: SubscriptionEventDataShape) => data.endsAt !== null)
  @IsFiniteDate()
  endsAt!: Date | null;
  @IsFiniteDate() startsAt!: Date;
  @IsFiniteDate() createdAt!: Date;
  @IsFiniteDate() updatedAt!: Date;
}

class SeatBasedSubscriptionEventDataShape
  extends SubscriptionEventDataShape
  implements SeatBasedSubscriptionEventData
{
  @Equals(SubscriptionType.SEAT_BASED)
  declare type: SubscriptionType.SEAT_BASED;
  @IsNumber() noOfSeats!: number;
  @IsNumber() pricePerSeat!: number;
  @IsEnum(RenewalCycle) renewalCycle!: RenewalCycle;
  @IsFiniteDate() renewalCycleAnchor!: Date;
}

class UsageBasedSubscriptionEventDataShape
  extends SubscriptionEventDataShape
  implements UsageBasedSubscriptionEventData
{
  @Equals(SubscriptionType.USAGE_BASED)
  declare type: SubscriptionType.USAGE_BASED;
  @IsNumber() monthlyCredits!: number;
}

class BillingInfoEventDataShape implements BillingInfoEventData {
  @IsString() companyName!: string;
  @IsString() street!: string;
  @IsString() houseNumber!: string;
  @IsString() postalCode!: string;
  @IsString() city!: string;
  @IsString() country!: string;
  @IsOptional() @IsString() vatNumber?: string;
  @IsOptional() @IsString() subText?: string;
  @IsUUID() orgId!: UUID;
  @IsUUID() subscriptionId!: UUID;
}

class SubscriptionEventShape<Payload extends object> {
  @IsUUID() orgId!: UUID;
  @IsDefined() @ValidateNested() payload!: Payload;
}

function instantiate<T extends object>(
  Shape: new () => T,
  value: unknown,
): T | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.assign(new Shape(), value)
    : null;
}

function payloadShape(
  value: unknown,
):
  | SeatBasedSubscriptionEventDataShape
  | UsageBasedSubscriptionEventDataShape
  | null {
  const probe = instantiate(SubscriptionEventDataShape, value);
  if (probe?.type === SubscriptionType.SEAT_BASED)
    return instantiate(SeatBasedSubscriptionEventDataShape, value);
  if (probe?.type === SubscriptionType.USAGE_BASED)
    return instantiate(UsageBasedSubscriptionEventDataShape, value);
  return null;
}

function readEvent<Payload extends { orgId: UUID }>(
  value: unknown,
  payload: Payload | null,
): { orgId: UUID; payload: Payload } | null {
  const event = instantiate(SubscriptionEventShape<Payload>, value);
  if (!event || !payload) return null;
  event.payload = payload;
  const valid =
    validateSync(event).length === 0 && event.orgId === payload.orgId;
  return valid ? event : null;
}

export function readSubscriptionEvent(
  value: unknown,
  type?: SubscriptionType,
): { orgId: UUID; payload: SubscriptionEventData } | null {
  const event = instantiate(SubscriptionEventShape, value);
  const read = readEvent(value, event ? payloadShape(event.payload) : null);
  return read && (type === undefined || read.payload.type === type)
    ? read
    : null;
}

export function readBillingInfoEvent(
  value: unknown,
): { orgId: UUID; payload: BillingInfoEventData } | null {
  const event = instantiate(SubscriptionEventShape, value);
  return readEvent(
    value,
    event ? instantiate(BillingInfoEventDataShape, event.payload) : null,
  );
}
