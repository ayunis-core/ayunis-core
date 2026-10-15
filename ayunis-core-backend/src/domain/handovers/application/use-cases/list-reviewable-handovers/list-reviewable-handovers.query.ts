import type { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';

export class ListReviewableHandoversQuery {
  constructor(public readonly kind: HandoverResourceType) {}
}
