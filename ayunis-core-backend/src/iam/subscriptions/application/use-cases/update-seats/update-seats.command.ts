import { UUID } from 'crypto';

export class UpdateSeatsCommand {
  public readonly orgId: UUID;
  public readonly requestingUserId: UUID;
  public readonly noOfSeats: number;

  constructor(params: {
    orgId: UUID;
    requestingUserId: UUID;
    noOfSeats?: number;
  }) {
    this.orgId = params.orgId;
    this.requestingUserId = params.requestingUserId;
    this.noOfSeats = params.noOfSeats ?? 1;
  }
}
