import type { UUID } from 'crypto';

export class PrepareEmbeddingsCommand {
  orgId: UUID;
  contents: string[];

  constructor(params: { orgId: UUID; contents: string[] }) {
    this.orgId = params.orgId;
    this.contents = params.contents;
  }
}
