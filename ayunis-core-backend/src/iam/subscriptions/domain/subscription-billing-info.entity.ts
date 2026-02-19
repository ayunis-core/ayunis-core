import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export interface SubscriptionBillingInfoParams {
  id?: UUID;
  createdAt?: Date;
  updatedAt?: Date;
  companyName: string;
  subText?: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  vatNumber?: string;
}
export class SubscriptionBillingInfo {
  id: UUID;
  createdAt: Date;
  updatedAt: Date;
  companyName: string;
  subText?: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  vatNumber?: string;

  constructor(params: SubscriptionBillingInfoParams) {
    this.id = params.id ?? randomUUID();
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
    this.companyName = params.companyName;
    this.street = params.street;
    this.houseNumber = params.houseNumber;
    this.subText = params.subText;
    this.postalCode = params.postalCode;
    this.city = params.city;
    this.country = params.country;
    this.vatNumber = params.vatNumber;
  }
}
