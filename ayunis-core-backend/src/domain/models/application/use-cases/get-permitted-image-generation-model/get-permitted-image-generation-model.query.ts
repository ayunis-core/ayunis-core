import type { UUID } from 'crypto';

export class GetPermittedImageGenerationModelQuery {
  orgId: UUID;

  constructor(params: { orgId: UUID }) {
    this.orgId = params.orgId;
  }
}
