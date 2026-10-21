import type { UUID } from 'crypto';
import type { HandoverRequest } from 'src/domain/handovers/domain/handover-request.entity';
import type { HandoverRequestView } from 'src/domain/handovers/domain/handover-request-view';
import type { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';
import type { HandoverStatus } from 'src/domain/handovers/domain/handover-status.enum';

export abstract class HandoverRequestsRepository {
  abstract lockResource(
    resourceType: HandoverResourceType,
    resourceId: UUID,
  ): Promise<void>;
  abstract create(request: HandoverRequest): Promise<HandoverRequest>;
  abstract findViewById(id: UUID): Promise<HandoverRequestView | null>;
  abstract findPendingForResource(
    resourceType: HandoverResourceType,
    resourceId: UUID,
  ): Promise<HandoverRequestView | null>;
  abstract findPendingInOrg(
    orgId: UUID,
    resourceType?: HandoverResourceType,
  ): Promise<HandoverRequestView[]>;
  abstract decide(
    id: UUID,
    status: HandoverStatus,
    decidedByUserId: UUID,
  ): Promise<boolean>;
}
