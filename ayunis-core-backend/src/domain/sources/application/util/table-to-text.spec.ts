import { tableToText } from './table-to-text';

describe('tableToText', () => {
  it('repeats headers per row, skips empty cells and rows', () => {
    const text = tableToText(
      [
        {
          sheetName: 'Fees',
          headers: ['Permit', 'Cost'],
          rows: [
            ['Special use', '50 EUR'],
            ['', ''],
            ['Parking', ''],
          ],
        },
        { sheetName: 'Other', headers: ['A'], rows: [['x']] },
      ],
      true,
    );
    expect(text).toBe(
      '## Fees\nPermit: Special use | Cost: 50 EUR\nPermit: Parking\n\n## Other\nA: x',
    );
  });

  it('omits sheet titles for a single table', () => {
    expect(
      tableToText([{ sheetName: 's', headers: ['A'], rows: [['1']] }], false),
    ).toBe('A: 1');
  });

  it('returns an empty string for header-only tables', () => {
    expect(
      tableToText([{ sheetName: 's', headers: ['A'], rows: [] }], true),
    ).toBe('');
  });
});
