import type { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';

export class ListHandoverTargetsQuery {
  constructor(public readonly kind: HandoverResourceType) {}
}
