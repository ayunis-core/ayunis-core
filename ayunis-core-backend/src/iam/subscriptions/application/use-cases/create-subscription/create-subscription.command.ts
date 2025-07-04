import { UUID } from 'crypto';
import { RenewalCycle } from '../../../domain/value-objects/renewal-cycle.enum';

export class CreateSubscriptionCommand {
  public readonly orgId: UUID;
  public readonly requestingUserId: UUID;
  public readonly noOfSeats: number;
  public readonly renewalCycle: RenewalCycle;

  constructor(params: {
    orgId: UUID;
    requestingUserId: UUID;
    noOfSeats?: number;
    renewalCycle: RenewalCycle;
  }) {
    this.orgId = params.orgId;
    this.requestingUserId = params.requestingUserId;
    this.noOfSeats = params.noOfSeats ?? 1;
    this.renewalCycle = params.renewalCycle;
  }
}
