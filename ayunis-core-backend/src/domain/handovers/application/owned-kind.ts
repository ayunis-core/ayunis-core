import type { OwnedResourceKind } from 'src/domain/ownership/application/models/owned-resource-kind';
import { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';

export function toOwnedKind(kind: HandoverResourceType): OwnedResourceKind {
  return kind === HandoverResourceType.SKILL ? 'skill' : 'knowledge_base';
}
