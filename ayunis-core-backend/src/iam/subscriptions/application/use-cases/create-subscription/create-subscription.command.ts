import { UUID } from 'crypto';

export class CreateSubscriptionCommand {
  public readonly orgId: UUID;
  public readonly requestingUserId: UUID;
  public readonly noOfSeats: number;
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
    noOfSeats?: number;
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
    this.noOfSeats = params.noOfSeats ?? 1;
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
