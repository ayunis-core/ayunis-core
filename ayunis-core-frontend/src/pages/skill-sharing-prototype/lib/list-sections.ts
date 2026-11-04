import { findTeam } from '@/widgets/sharing-prototype/model/access';
import type {
  OwnedItem,
  Person,
  TransferTarget,
} from '@/widgets/sharing-prototype/model/types';
import { isOwnSkill } from './skill-meta';

export type SectionKey = 'own' | 'org' | `team:${string}`;
export type ListFilter = 'all' | 'requests' | SectionKey;

export interface ListSection<T extends OwnedItem> {
  key: SectionKey;
  title: string;
  items: T[];
}

export interface FilterOption {
  value: ListFilter;
  label: string;
}

function targetKey(target: TransferTarget): SectionKey {
  return target.kind === 'org' ? 'org' : `team:${target.teamId}`;
}

function sectionKeyOf(
  item: OwnedItem,
  person: Person,
  sharedTarget: TransferTarget | null,
): SectionKey | null {
  if (isOwnSkill(item, person)) return 'own';
  const { owner } = item;
  if (owner.kind === 'org') return 'org';
  if (owner.kind === 'team') {
    return person.teamIds.includes(owner.teamId)
      ? `team:${owner.teamId}`
      : null;
  }
  return sharedTarget ? targetKey(sharedTarget) : null;
}

export function listSections<T extends OwnedItem>(
  items: T[],
  person: Person,
  sharedTargetOf: (item: T) => TransferTarget | null,
): ListSection<T>[] {
  const keyed = items.map((item) => ({
    item,
    key: sectionKeyOf(item, person, sharedTargetOf(item)),
  }));
  const itemsIn = (key: SectionKey) =>
    keyed.filter((entry) => entry.key === key).map((entry) => entry.item);
  return [
    { key: 'own', title: 'Eigene', items: itemsIn('own') },
    ...person.teamIds.map((teamId) => ({
      key: `team:${teamId}` as const,
      title: `Team ${findTeam(teamId).name}`,
      items: itemsIn(`team:${teamId}`),
    })),
    { key: 'org', title: 'Organisation', items: itemsIn('org') },
  ];
}

export function filterOptions(
  sections: ListSection<OwnedItem>[],
  canReview: boolean,
): FilterOption[] {
  const requests: FilterOption[] = canReview
    ? [{ value: 'requests', label: 'Offene Anfragen' }]
    : [];
  return [
    { value: 'all', label: 'Alle' },
    ...requests,
    ...sections
      .filter((section) => section.key === 'own' || section.items.length > 0)
      .map((section) => ({ value: section.key, label: section.title })),
  ];
}

export function resolveFilter(
  filter: ListFilter,
  options: FilterOption[],
): ListFilter {
  return options.some((option) => option.value === filter) ? filter : 'all';
}

export function visibleSections<T extends OwnedItem>(
  sections: ListSection<T>[],
  filter: ListFilter,
  query: string,
): ListSection<T>[] {
  if (filter === 'requests') return [];
  return sections.filter((section) => {
    if (filter !== 'all' && section.key !== filter) return false;
    if (section.items.length > 0) return true;
    return section.key === 'own' && !query;
  });
}
