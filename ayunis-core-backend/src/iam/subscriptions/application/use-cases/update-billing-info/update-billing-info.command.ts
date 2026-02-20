import type { UUID } from 'crypto';

export interface UpdateBillingInfoParams {
  companyName: string;
  street: string;
  houseNumber: string;
  city: string;
  postalCode: string;
  country: string;
  vatNumber?: string;
}
export class UpdateBillingInfoCommand {
  orgId: UUID;
  billingInfo: UpdateBillingInfoParams;
  requestingUserId: UUID;

  constructor(params: {
    orgId: UUID;
    billingInfo: UpdateBillingInfoParams;
    requestingUserId: UUID;
  }) {
    this.orgId = params.orgId;
    this.billingInfo = params.billingInfo;
    this.requestingUserId = params.requestingUserId;
  }
}
