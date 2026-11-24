import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export interface OparlBodyLinkParams {
  id?: UUID;
  orgId: UUID;
  bodyId: UUID;
  /** `null` once the user who linked it is deleted. */
  linkedByUserId: UUID | null;
  linkedAt?: Date;
}

/** An organization's use of a mirrored body: the only way org data reaches the mirror. */
export class OparlBodyLink {
  readonly id: UUID;
  readonly orgId: UUID;
  readonly bodyId: UUID;
  readonly linkedByUserId: UUID | null;
  readonly linkedAt: Date;

  constructor(params: OparlBodyLinkParams) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.bodyId = params.bodyId;
    this.linkedByUserId = params.linkedByUserId;
    this.linkedAt = params.linkedAt ?? new Date();
  }
}
