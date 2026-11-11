import type { OwnedResource } from '@/features/resource-ownership/model/types';

export type OwnerSectionOwner =
  | { ownerType: 'personal' }
  | { ownerType: 'org' }
  | { ownerType: 'team'; teamId: string };

export interface OwnerSection<T> {
  /** Stable key: `personal`, `org`, or `team:<id>`. */
  key: string;
  owner: OwnerSectionOwner;
  items: T[];
}

interface NamedTeam {
  id: string;
  name: string;
}

function ownerOfListItem(resource: OwnedResource): OwnerSectionOwner | null {
  switch (resource.ownerType) {
    case 'personal':
      return { ownerType: 'personal' };
    case 'org':
      return { ownerType: 'org' };
    case 'team':
      return resource.teamId
        ? { ownerType: 'team', teamId: resource.teamId }
        : null;
    case 'workspace':
      return null;
  }
}

function sectionKey(owner: OwnerSectionOwner): string {
  return owner.ownerType === 'team' ? `team:${owner.teamId}` : owner.ownerType;
}

const OWNER_TYPE_ORDER = ['personal', 'org', 'team'] as const;

/**
 * Groups a list into its owners' sections: personal, organisation, then each
 * team by name. Owners without items get no section.
 */
export function groupByOwner<T extends OwnedResource & { name: string }>(
  items: readonly T[],
  teams: readonly NamedTeam[],
): OwnerSection<T>[] {
  const sections = new Map<string, OwnerSection<T>>();
  for (const item of items) {
    const owner = ownerOfListItem(item);
    if (!owner) continue;
    const key = sectionKey(owner);
    const section = sections.get(key) ?? { key, owner, items: [] };
    section.items.push(item);
    sections.set(key, section);
  }

  const teamName = (owner: OwnerSectionOwner) =>
    owner.ownerType === 'team'
      ? (teams.find((team) => team.id === owner.teamId)?.name ?? owner.teamId)
      : '';

  for (const section of sections.values()) {
    section.items.sort((a, b) => a.name.localeCompare(b.name));
  }
  return [...sections.values()].sort(
    (a, b) =>
      OWNER_TYPE_ORDER.indexOf(a.owner.ownerType) -
        OWNER_TYPE_ORDER.indexOf(b.owner.ownerType) ||
      teamName(a.owner).localeCompare(teamName(b.owner)),
  );
}
