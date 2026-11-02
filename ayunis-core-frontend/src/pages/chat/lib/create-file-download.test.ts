import { describe, expect, it } from 'vitest';
import { parseFileDownload, resolveFileContent } from './create-file-download';

const rows =
  'Artikel,Bestand,Status\r\n"Stuhl, groß",12,grün\r\n"Regal ""Nord""",4,orange\r\n';

describe('CSV downloads', () => {
  it('preserves every reconciliation row and normalizes the extension', () => {
    expect(
      parseFileDownload(
        { filename: 'Inventur.CSV.csv', format: 'csv', content: rows },
        new Map(),
      ),
    ).toEqual({ filename: 'Inventur.csv', format: 'csv', content: rows });
  });

  it.each([
    [
      'Name,Status\n{{pii:ORGANIZATION_1}},grün',
      'Name,Status\n"Müller, ""Nord"";\nSüd",grün',
    ],
    [
      'Name;Status\n"{{pii:ORGANIZATION_1}}";grün',
      'Name;Status\n"Müller, ""Nord"";\nSüd";grün',
    ],
    [
      'Name,Status\n"Team {{pii:ORGANIZATION_1}}",grün',
      'Name,Status\n"Team Müller, ""Nord"";\nSüd",grün',
    ],
    [
      'Name;Status\n{{pii:ORGANIZATION_1}};grün\n',
      'Name;Status\n"Müller, ""Nord"";\nSüd";grün\n',
    ],
  ])(
    'restores masked values without changing cell boundaries',
    (content, expected) => {
      const file = parseFileDownload(
        { filename: 'Inventur', format: 'csv', content },
        new Map(),
      );
      expect(file).not.toBeNull();
      expect(
        resolveFileContent(
          file!,
          new Map([
            ['{{pii:ORGANIZATION_1}}', { value: 'Müller, "Nord";\nSüd' }],
          ]),
        ),
      ).toBe(expected);
    },
  );

  it('preserves the original CSV when no values are restored', () => {
    const file = parseFileDownload(
      { filename: 'Inventur', format: 'csv', content: rows },
      new Map(),
    );
    expect(file).not.toBeNull();
    expect(resolveFileContent(file!, new Map())).toBe(rows);
  });
});
