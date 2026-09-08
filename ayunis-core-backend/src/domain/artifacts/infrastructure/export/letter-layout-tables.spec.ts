import { LAYOUT_TABLE_CLASS, markLayoutTables } from './letter-layout-tables';

describe('markLayoutTables', () => {
  it('should mark a header-less table as a layout table', () => {
    const html =
      '<table><tbody><tr><td>Herr Müller</td><td>Elisabetta Cavalet</td></tr></tbody></table>';

    expect(markLayoutTables(html)).toContain(`class="${LAYOUT_TABLE_CLASS}"`);
  });

  it('should leave a table with a header row untouched', () => {
    const html =
      '<table><thead><tr><th>Posten</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>';

    expect(markLayoutTables(html)).toBe(html);
  });

  it('should detect a header cell that is not wrapped in a thead', () => {
    const html = '<table><tr><th>Posten</th></tr><tr><td>1</td></tr></table>';

    expect(markLayoutTables(html)).toBe(html);
  });

  it('should return the input unchanged when there is no table', () => {
    const html = '<p>Sehr geehrter Herr Müller,</p>';

    expect(markLayoutTables(html)).toBe(html);
  });

  it('should preserve cell content while marking the table', () => {
    const html =
      '<table><tbody><tr><td><p>Hauptstraße 5</p></td><td><p>ZB 14</p></td></tr></tbody></table>';

    const marked = markLayoutTables(html);

    expect(marked).toContain('Hauptstraße 5');
    expect(marked).toContain('ZB 14');
  });

  it('should mark each header-less table when several are present', () => {
    const html =
      '<table><tbody><tr><td>a</td></tr></tbody></table>' +
      '<table><tbody><tr><td>b</td></tr></tbody></table>';

    const occurrences = markLayoutTables(html).split(LAYOUT_TABLE_CLASS).length;

    expect(occurrences - 1).toBe(2);
  });

  it('should mark only the header-less table in a mixed document', () => {
    const html =
      '<table><tbody><tr><td>address</td><td>contact</td></tr></tbody></table>' +
      '<table><thead><tr><th>Posten</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>';

    const marked = markLayoutTables(html);

    expect(marked.split(LAYOUT_TABLE_CLASS)).toHaveLength(2);
    expect(marked).toContain('<th>Posten</th>');
  });
});
