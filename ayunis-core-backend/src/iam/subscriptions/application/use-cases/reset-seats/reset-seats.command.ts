import { UUID } from 'crypto';

export class ResetSeatsCommand {
  public readonly orgId: UUID;

  constructor(params: { orgId: UUID }) {
    this.orgId = params.orgId;
  }
}
