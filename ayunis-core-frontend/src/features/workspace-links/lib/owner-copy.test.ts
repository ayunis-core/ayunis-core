import { describe, expect, it } from 'vitest';
import { ownerLabel, ownerLines } from './owner-copy';

const lena = { id: 'lena', name: 'Lena Hoffmann' };

describe('ownerLabel', () => {
  it('names the owner from the viewer’s point of view', () => {
    expect(
      ownerLabel({ type: 'personal', id: 'lena', name: lena.name }, 'lena'),
    ).toEqual({ key: 'links.owner.you' });
    expect(
      ownerLabel({ type: 'personal', id: 'lena', name: lena.name }, 'tobias'),
    ).toEqual({ key: 'links.owner.person', values: { name: lena.name } });
    expect(
      ownerLabel({ type: 'team', id: 'team-1', name: 'Bauamt' }, 'lena'),
    ).toEqual({ key: 'links.owner.team', values: { team: 'Bauamt' } });
    expect(
      ownerLabel({ type: 'org', id: 'org-1', name: null }, 'lena'),
    ).toEqual({ key: 'links.owner.org' });
  });
});

describe('ownerLines', () => {
  it('says who owns the item and who linked it', () => {
    expect(
      ownerLines(
        { type: 'team', id: 'team-1', name: 'Bauamt' },
        lena,
        'tobias',
      ),
    ).toEqual([
      { key: 'links.belongs.team', values: { team: 'Bauamt' } },
      { key: 'links.linkedBy.person', values: { name: lena.name } },
    ]);
    expect(
      ownerLines(
        { type: 'personal', id: 'lena', name: lena.name },
        lena,
        'lena',
      ),
    ).toEqual([{ key: 'links.belongs.you' }, { key: 'links.linkedBy.you' }]);
  });

  it('leaves out the linking person once they no longer exist', () => {
    expect(
      ownerLines({ type: 'org', id: 'org-1', name: null }, null, 'lena'),
    ).toEqual([{ key: 'links.belongs.org' }]);
  });
});
