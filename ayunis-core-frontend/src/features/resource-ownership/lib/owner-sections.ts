import type { OwnedResource } from '@/features/resource-ownership/model/types';

export interface OwnerSection<T> {
  key: string;
  teamName: string | null;
  items: T[];
}

export function ownerSections<T extends OwnedResource>(
  items: readonly T[],
): OwnerSection<T>[] {
  const teams = new Map<string, OwnerSection<T>>();
  const org: T[] = [];
  for (const item of items) {
    if (item.ownerType === 'org') {
      org.push(item);
    } else if (item.ownerType === 'team' && item.teamId) {
      const section = teams.get(item.teamId) ?? {
        key: `team:${item.teamId}`,
        teamName: item.ownerDescription?.teamName ?? '',
        items: [],
      };
      section.items.push(item);
      teams.set(item.teamId, section);
    }
  }
  const sortedTeams = [...teams.values()].sort((left, right) =>
    (left.teamName ?? '').localeCompare(right.teamName ?? ''),
  );
  return org.length > 0
    ? [...sortedTeams, { key: 'org', teamName: null, items: org }]
    : sortedTeams;
}
