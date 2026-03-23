import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';

/**
 * Tests for the letterhead suffix logic in ToolAssemblyService.
 * We test the private `buildLetterheadSuffix` via a minimal instance
 * constructed with null dependencies — only the pure helper is called.
 */
describe('ToolAssemblyService — letterhead suffix', () => {
  let service: any;

  beforeEach(async () => {
    // Dynamically import to avoid eager resolution of all NestJS decorators
    const mod = await import('./tool-assembly.service');
    // Create a bare instance — we only call pure private helpers, no DI needed
    service = new (mod.ToolAssemblyService as any)(
      ...Array<null>(12).fill(null),
    );
  });

  const mockOrgId = randomUUID();

  function createLetterhead(overrides?: {
    name?: string;
    description?: string | null;
    id?: UUID;
  }): Letterhead {
    return new Letterhead({
      id: overrides?.id ?? randomUUID(),
      orgId: mockOrgId,
      name: overrides?.name ?? 'Stadt Musterstadt',
      description:
        overrides?.description !== undefined
          ? overrides.description
          : 'Offizielles Briefpapier',
      firstPageStoragePath: `letterheads/${mockOrgId}/first.pdf`,
      firstPageMargins: { top: 55, bottom: 20, left: 20, right: 20 },
      continuationPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
    });
  }

  it('should return empty string when no letterheads exist', () => {
    const result = service.buildLetterheadSuffix([]);
    expect(result).toBe('');
  });

  it('should include letterhead name and description in suffix', () => {
    const letterhead = createLetterhead({
      name: 'Gemeinde Testdorf',
      description: 'Für formelle Schreiben',
    });

    const result = service.buildLetterheadSuffix([letterhead]);

    expect(result).toContain('Gemeinde Testdorf');
    expect(result).toContain('Für formelle Schreiben');
    expect(result).toContain(letterhead.id);
    expect(result).toContain('letterhead_id');
  });

  it('should handle letterhead without description', () => {
    const letterhead = createLetterhead({
      name: 'Einfaches Briefpapier',
      description: null,
    });

    const result = service.buildLetterheadSuffix([letterhead]);

    expect(result).toContain('Einfaches Briefpapier');
    expect(result).not.toContain(' — ');
  });

  it('should list multiple letterheads', () => {
    const letterheads = [
      createLetterhead({ name: 'Briefpapier A' }),
      createLetterhead({ name: 'Briefpapier B' }),
    ];

    const result = service.buildLetterheadSuffix(letterheads);

    expect(result).toContain('Briefpapier A');
    expect(result).toContain('Briefpapier B');
    expect(result).toContain('Available letterheads (Briefpapier)');
  });
});
