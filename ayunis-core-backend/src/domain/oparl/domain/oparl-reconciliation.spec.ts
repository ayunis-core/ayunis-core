import { OparlEntityType } from './oparl-entity-type.enum';
import { reconciliationVerdict } from './oparl-reconciliation';

describe('reconciliationVerdict', () => {
  it('removes what a complete listing no longer contains, up to a tenth of a type', () => {
    expect(
      reconciliationVerdict(null, [
        { type: OparlEntityType.PAPER, total: 970, removed: 97 },
        { type: OparlEntityType.MEETING, total: 667, removed: 0 },
      ]),
    ).toEqual({ deletes: true });
  });

  it('removes nothing when a type would lose more than a tenth of its rows', () => {
    const verdict = reconciliationVerdict(null, [
      { type: OparlEntityType.PAPER, total: 970, removed: 98 },
    ]);
    expect(verdict).toEqual({
      deletes: false,
      reason: expect.stringContaining('paper 98 of 970') as string,
    });
  });

  it('removes nothing when the only body is no longer listed', () => {
    expect(
      reconciliationVerdict(null, [
        { type: OparlEntityType.BODY, total: 1, removed: 1 },
      ]).deletes,
    ).toBe(false);
  });

  it('removes nothing after an incomplete listing', () => {
    expect(
      reconciliationVerdict('The OParl endpoint answered with HTTP 503', []),
    ).toEqual({
      deletes: false,
      reason: 'Listing incomplete: The OParl endpoint answered with HTTP 503',
    });
  });
});
