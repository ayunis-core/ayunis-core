import { UUID } from 'crypto';

export class CreateUrlSourceCommand {
  url: string;
  orgId: UUID;

  constructor(params: { url: string; orgId: UUID }) {
    this.url = params.url;
    this.orgId = params.orgId;
  }
}
