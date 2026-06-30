import type { UUID } from 'crypto';
import { SubscriptionType } from '../../../domain/value-objects/subscription-type.enum';
import type { OldSubscriptionDisposition } from '../../../domain/value-objects/old-subscription-disposition.enum';

/**
 * Replace an organization's current subscription with a new one. The current
 * subscription is ended according to {@link disposition} (cancelled or deleted)
 * and a brand-new subscription is created with the supplied data — this is the
 * only correct way to change subscription type, since the type is a TypeORM STI
 * discriminator and cannot be mutated in place.
 */
export class ChangeSubscriptionCommand {
  public readonly orgId: UUID;
  public readonly requestingUserId: UUID;
  public readonly disposition: OldSubscriptionDisposition;
  public readonly type: SubscriptionType;
  public readonly noOfSeats?: number;
  public readonly monthlyCredits?: number;
  public readonly companyName: string;
  public readonly subText?: string;
  public readonly street: string;
  public readonly houseNumber: string;
  public readonly postalCode: string;
  public readonly city: string;
  public readonly country: string;
  public readonly vatNumber?: string;
  public readonly startsAt?: Date;

  constructor(params: {
    orgId: UUID;
    requestingUserId: UUID;
    disposition: OldSubscriptionDisposition;
    type?: SubscriptionType;
    noOfSeats?: number;
    monthlyCredits?: number;
    companyName: string;
    subText?: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    country: string;
    vatNumber?: string;
    startsAt?: Date;
  }) {
    this.orgId = params.orgId;
    this.requestingUserId = params.requestingUserId;
    this.disposition = params.disposition;
    this.type = params.type ?? SubscriptionType.SEAT_BASED;
    this.noOfSeats = params.noOfSeats;
    this.monthlyCredits = params.monthlyCredits;
    this.companyName = params.companyName;
    this.subText = params.subText;
    this.street = params.street;
    this.houseNumber = params.houseNumber;
    this.postalCode = params.postalCode;
    this.city = params.city;
    this.country = params.country;
    this.vatNumber = params.vatNumber;
    this.startsAt = params.startsAt;
  }
}
