export { useResourceOwnership } from './api/useResourceOwnership';
export { OwnerSelect } from './ui/OwnerSelect';
export { OwnerBadge } from './ui/OwnerBadge';
export { ownerChangeErrorKey } from './lib/owner-change-error';
export {
  canLinkKnowledgeBase,
  canManageResource,
  manageableOwners,
  ownerKey,
  ownerOf,
} from './lib/ownership';
export type {
  OwnedResource,
  OwnedResourceKind,
  OwnerOption,
  OwnerSelection,
} from './model/types';
