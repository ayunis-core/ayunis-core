import { matchesSearch } from '@/shared/lib/matches-search';
import type {
  LinkableGroup,
  LinkableItem,
  LinkableSection,
} from '@/features/workspace-links/model/types';

const GROUP_ORDER: LinkableGroup[] = ['own', 'team', 'org'];

export function toLinkableSections(
  groups: Record<LinkableGroup, LinkableItem[]>,
): LinkableSection[] {
  return GROUP_ORDER.map((group) => ({ group, items: groups[group] })).filter(
    ({ items }) => items.length > 0,
  );
}

export function filterSections(
  sections: LinkableSection[],
  query: string,
): LinkableSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        matchesSearch(query, [item.name, item.description]),
      ),
    }))
    .filter(({ items }) => items.length > 0);
}
