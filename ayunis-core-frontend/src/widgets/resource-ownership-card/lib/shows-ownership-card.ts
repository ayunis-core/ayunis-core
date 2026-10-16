import type { OwnedResource } from '@/features/resource-ownership';

export function showsOwnershipCard(resource: OwnedResource): boolean {
  return resource.ownerType !== 'workspace' && !resource.isShared;
}
