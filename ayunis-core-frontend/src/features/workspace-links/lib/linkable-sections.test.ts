import { describe, expect, it } from 'vitest';
import type { LinkableItem } from '@/features/workspace-links/model/types';
import { filterSections, toLinkableSections } from './linkable-sections';

function item(id: string, name: string, description = ''): LinkableItem {
  return {
    id,
    name,
    description,
    owner: { type: 'personal', id: 'lena', name: 'Lena' },
  };
}

describe('toLinkableSections', () => {
  it('orders own, team and organisation items and drops empty groups', () => {
    const sections = toLinkableSections({
      org: [item('o', 'Datenschutz')],
      own: [item('p', 'Protokoll')],
      team: [],
    });

    expect(sections.map(({ group }) => group)).toEqual(['own', 'org']);
  });
});

describe('filterSections', () => {
  it('searches name and description and hides groups without hits', () => {
    const sections = toLinkableSections({
      own: [item('p', 'Protokoll', 'Fasst Besprechungen zusammen')],
      team: [item('t', 'Bauantrag prüfen')],
      org: [],
    });

    expect(filterSections(sections, 'besprech')).toEqual([
      { group: 'own', items: [sections[0].items[0]] },
    ]);
    expect(filterSections(sections, 'nichts')).toEqual([]);
  });
});
