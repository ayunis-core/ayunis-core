import { randomUUID } from 'crypto';
import { LetterheadMapper } from './letterhead.mapper';
import { Letterhead } from '../../../../domain/letterhead.entity';
import { LetterheadRecord } from '../schema/letterhead.record';
import type { PageMargins } from '../../../../domain/value-objects/page-margins';

describe('LetterheadMapper', () => {
  let mapper: LetterheadMapper;

  beforeEach(() => {
    mapper = new LetterheadMapper();
  });

  const now = new Date('2026-02-27T14:00:00.000Z');
  const letterheadId = randomUUID();
  const orgId = randomUUID();

  const firstPageMargins: PageMargins = {
    top: 55,
    bottom: 20,
    left: 15,
    right: 15,
  };

  const continuationPageMargins: PageMargins = {
    top: 20,
    bottom: 20,
    left: 15,
    right: 15,
  };

  describe('toDomain', () => {
    it('should map a record with all fields to a domain entity', () => {
      const record = new LetterheadRecord();
      record.id = letterheadId;
      record.orgId = orgId;
      record.name = 'Stadtverwaltung Musterstadt';
      record.description = 'Offizielles Briefpapier der Stadtverwaltung';
      record.firstPageStoragePath = `letterheads/${orgId}/${letterheadId}/first-page.pdf`;
      record.continuationPageStoragePath = `letterheads/${orgId}/${letterheadId}/continuation.pdf`;
      record.firstPageMargins = firstPageMargins;
      record.continuationPageMargins = continuationPageMargins;
      record.createdAt = now;
      record.updatedAt = now;

      const domain = mapper.toDomain(record);

      expect(domain).toBeInstanceOf(Letterhead);
      expect(domain.id).toBe(letterheadId);
      expect(domain.orgId).toBe(orgId);
      expect(domain.name).toBe('Stadtverwaltung Musterstadt');
      expect(domain.description).toBe(
        'Offizielles Briefpapier der Stadtverwaltung',
      );
      expect(domain.firstPageStoragePath).toBe(
        `letterheads/${orgId}/${letterheadId}/first-page.pdf`,
      );
      expect(domain.continuationPageStoragePath).toBe(
        `letterheads/${orgId}/${letterheadId}/continuation.pdf`,
      );
      expect(domain.firstPageMargins).toEqual(firstPageMargins);
      expect(domain.continuationPageMargins).toEqual(continuationPageMargins);
      expect(domain.createdAt).toBe(now);
      expect(domain.updatedAt).toBe(now);
    });

    it('should map a record with nullable fields set to null', () => {
      const record = new LetterheadRecord();
      record.id = letterheadId;
      record.orgId = orgId;
      record.name = 'Einfaches Briefpapier';
      record.description = null;
      record.firstPageStoragePath = `letterheads/${orgId}/${letterheadId}/first-page.pdf`;
      record.continuationPageStoragePath = null;
      record.firstPageMargins = firstPageMargins;
      record.continuationPageMargins = continuationPageMargins;
      record.createdAt = now;
      record.updatedAt = now;

      const domain = mapper.toDomain(record);

      expect(domain.description).toBeNull();
      expect(domain.continuationPageStoragePath).toBeNull();
    });
  });

  describe('toRecord', () => {
    it('should map a domain entity to a record', () => {
      const domain = new Letterhead({
        id: letterheadId,
        orgId,
        name: 'Stadtverwaltung Musterstadt',
        description: 'Offizielles Briefpapier der Stadtverwaltung',
        firstPageStoragePath: `letterheads/${orgId}/${letterheadId}/first-page.pdf`,
        continuationPageStoragePath: `letterheads/${orgId}/${letterheadId}/continuation.pdf`,
        firstPageMargins,
        continuationPageMargins,
        createdAt: now,
        updatedAt: now,
      });

      const record = mapper.toRecord(domain);

      expect(record).toBeInstanceOf(LetterheadRecord);
      expect(record.id).toBe(letterheadId);
      expect(record.orgId).toBe(orgId);
      expect(record.name).toBe('Stadtverwaltung Musterstadt');
      expect(record.description).toBe(
        'Offizielles Briefpapier der Stadtverwaltung',
      );
      expect(record.firstPageStoragePath).toBe(
        `letterheads/${orgId}/${letterheadId}/first-page.pdf`,
      );
      expect(record.continuationPageStoragePath).toBe(
        `letterheads/${orgId}/${letterheadId}/continuation.pdf`,
      );
      expect(record.firstPageMargins).toEqual(firstPageMargins);
      expect(record.continuationPageMargins).toEqual(continuationPageMargins);
    });
  });

  describe('round-trip', () => {
    it('should preserve all fields through domain → record → domain', () => {
      const original = new Letterhead({
        id: letterheadId,
        orgId,
        name: 'Gemeinde Beispieldorf',
        description: 'Briefpapier für amtliche Schreiben',
        firstPageStoragePath: `letterheads/${orgId}/${letterheadId}/first-page.pdf`,
        continuationPageStoragePath: `letterheads/${orgId}/${letterheadId}/continuation.pdf`,
        firstPageMargins,
        continuationPageMargins,
        createdAt: now,
        updatedAt: now,
      });

      const record = mapper.toRecord(original);
      record.createdAt = now;
      record.updatedAt = now;
      const reconstructed = mapper.toDomain(record);

      expect(reconstructed.id).toBe(original.id);
      expect(reconstructed.orgId).toBe(original.orgId);
      expect(reconstructed.name).toBe(original.name);
      expect(reconstructed.description).toBe(original.description);
      expect(reconstructed.firstPageStoragePath).toBe(
        original.firstPageStoragePath,
      );
      expect(reconstructed.continuationPageStoragePath).toBe(
        original.continuationPageStoragePath,
      );
      expect(reconstructed.firstPageMargins).toEqual(original.firstPageMargins);
      expect(reconstructed.continuationPageMargins).toEqual(
        original.continuationPageMargins,
      );
    });

    it('should preserve null fields through round-trip', () => {
      const original = new Letterhead({
        id: letterheadId,
        orgId,
        name: 'Minimales Briefpapier',
        firstPageStoragePath: `letterheads/${orgId}/${letterheadId}/first-page.pdf`,
        firstPageMargins,
        continuationPageMargins,
        createdAt: now,
        updatedAt: now,
      });

      const record = mapper.toRecord(original);
      record.createdAt = now;
      record.updatedAt = now;
      const reconstructed = mapper.toDomain(record);

      expect(reconstructed.description).toBeNull();
      expect(reconstructed.continuationPageStoragePath).toBeNull();
    });
  });
});
