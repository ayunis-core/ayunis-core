import type { UUID } from 'crypto';
import { SubscriptionType } from '../../../domain/value-objects/subscription-type.enum';

export class CreateSubscriptionCommand {
  public readonly orgId: UUID;
  public readonly requestingUserId: UUID;
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

  constructor(params: {
    orgId: UUID;
    requestingUserId: UUID;
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
  }) {
    this.orgId = params.orgId;
    this.requestingUserId = params.requestingUserId;
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
  }
}
