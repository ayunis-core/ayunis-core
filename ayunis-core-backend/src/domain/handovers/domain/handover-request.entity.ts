import { randomUUID, type UUID } from 'crypto';
import type { HandoverResourceType } from './handover-resource-type.enum';
import { HandoverStatus } from './handover-status.enum';
import type { HandoverTarget } from './handover-target';

export interface HandoverRequestParams {
  id?: UUID;
  orgId: UUID;
  resourceType: HandoverResourceType;
  resourceId: UUID;
  target: HandoverTarget;
  requestedByUserId: UUID;
  status?: HandoverStatus;
  createdAt?: Date;
  decidedAt?: Date | null;
  decidedByUserId?: UUID | null;
}

export class HandoverRequest {
  readonly id: UUID;
  readonly orgId: UUID;
  readonly resourceType: HandoverResourceType;
  readonly resourceId: UUID;
  readonly target: HandoverTarget;
  readonly requestedByUserId: UUID;
  readonly status: HandoverStatus;
  readonly createdAt: Date;
  readonly decidedAt: Date | null;
  readonly decidedByUserId: UUID | null;

  constructor(params: HandoverRequestParams) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.resourceType = params.resourceType;
    this.resourceId = params.resourceId;
    this.target = params.target;
    this.requestedByUserId = params.requestedByUserId;
    this.status = params.status ?? HandoverStatus.PENDING;
    this.createdAt = params.createdAt ?? new Date();
    this.decidedAt = params.decidedAt ?? null;
    this.decidedByUserId = params.decidedByUserId ?? null;
  }

  get isPending(): boolean {
    return this.status === HandoverStatus.PENDING;
  }

  decided(status: HandoverStatus, byUserId: UUID): HandoverRequest {
    return new HandoverRequest({
      ...this,
      status,
      decidedAt: new Date(),
      decidedByUserId: byUserId,
    });
  }
}
