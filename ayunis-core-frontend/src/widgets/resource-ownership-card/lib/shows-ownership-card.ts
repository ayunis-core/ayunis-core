import type { OwnedResource } from '@/features/resource-ownership';

export function showsOwnershipCard(resource: OwnedResource): boolean {
  if (resource.ownerType === 'workspace') return false;
  if (resource.ownerType === 'personal') {
    return resource.viewer?.canEdit !== false;
  }
  return true;
}
