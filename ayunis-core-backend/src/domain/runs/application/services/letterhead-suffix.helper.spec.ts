import { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';
import { buildLetterheadSuffix } from './letterhead-suffix.helper';

const MARGINS = { top: 45, bottom: 20, left: 25, right: 20 };

function makeLetterhead(
  overrides: Partial<{ name: string; description: string | null }> = {},
) {
  return new Letterhead({
    id: '11111111-1111-1111-1111-111111111111',
    orgId: '22222222-2222-2222-2222-222222222222',
    name: overrides.name ?? 'Offizielles Briefpapier',
    description:
      overrides.description === undefined
        ? 'Kreisverwaltung'
        : overrides.description,
    firstPageStoragePath: 'letterheads/first.pdf',
    firstPageMargins: MARGINS,
    continuationPageMargins: MARGINS,
  });
}

describe('buildLetterheadSuffix', () => {
  it('should return an empty string when the org has no letterheads', () => {
    expect(buildLetterheadSuffix([])).toBe('');
  });

  it('should list each letterhead id and name', () => {
    const suffix = buildLetterheadSuffix([makeLetterhead()]);

    expect(suffix).toContain('11111111-1111-1111-1111-111111111111');
    expect(suffix).toContain('Offizielles Briefpapier');
    expect(suffix).toContain('Kreisverwaltung');
  });

  it('should omit the separator when a letterhead has no description', () => {
    const suffix = buildLetterheadSuffix([
      makeLetterhead({ description: null }),
    ]);

    const listLine = suffix
      .split('\n')
      .find((line) => line.startsWith('- 11111111'));

    expect(listLine).toBe(
      '- 11111111-1111-1111-1111-111111111111: "Offizielles Briefpapier"',
    );
  });

  describe('letter layout guidance', () => {
    it('should ask for a header-less two-column block for the address and contact details', () => {
      const suffix = buildLetterheadSuffix([makeLetterhead()]);

      expect(suffix).toContain('two-column table');
      expect(suffix).toMatch(/no header row/i);
    });

    it('should place the recipient left and the sender contact details right', () => {
      const suffix = buildLetterheadSuffix([makeLetterhead()]);

      expect(suffix).toMatch(/left cell.*recipient/i);
      expect(suffix).toMatch(/right cell.*(sender|contact)/i);
    });

    it('should ask for a bold subject line before the body', () => {
      const suffix = buildLetterheadSuffix([makeLetterhead()]);

      expect(suffix).toMatch(/subject/i);
      expect(suffix).toMatch(/bold/i);
    });

    it('should forbid repeating the letterhead header and footer in the content', () => {
      const suffix = buildLetterheadSuffix([makeLetterhead()]);

      expect(suffix).toMatch(/never repeat/i);
      expect(suffix).toMatch(/logo|header|footer/i);
    });

    it('should require a header row on real data tables', () => {
      const suffix = buildLetterheadSuffix([makeLetterhead()]);

      expect(suffix).toContain('<th>');
    });

    it('should not emit guidance when there are no letterheads', () => {
      expect(buildLetterheadSuffix([])).not.toMatch(/two-column/i);
    });
  });
});
