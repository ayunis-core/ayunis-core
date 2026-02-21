import { randomUUID } from 'crypto';
import { KnowledgeBaseMapper } from './knowledge-base.mapper';
import { KnowledgeBase } from '../../../../domain/knowledge-base.entity';
import { KnowledgeBaseRecord } from '../schema/knowledge-base.record';

describe('KnowledgeBaseMapper', () => {
  let mapper: KnowledgeBaseMapper;

  beforeEach(() => {
    mapper = new KnowledgeBaseMapper();
  });

  describe('toDomain', () => {
    it('should map all fields from record to domain entity', () => {
      const record = new KnowledgeBaseRecord();
      record.id = randomUUID();
      record.name = 'Stadtrecht Gemeinde Musterstadt';
      record.description = 'Satzungen und Verordnungen';
      record.orgId = randomUUID();
      record.userId = randomUUID();
      record.createdAt = new Date('2025-03-15');
      record.updatedAt = new Date('2025-04-01');

      const entity = mapper.toDomain(record);

      expect(entity).toBeInstanceOf(KnowledgeBase);
      expect(entity.id).toBe(record.id);
      expect(entity.name).toBe('Stadtrecht Gemeinde Musterstadt');
      expect(entity.description).toBe('Satzungen und Verordnungen');
      expect(entity.orgId).toBe(record.orgId);
      expect(entity.userId).toBe(record.userId);
      expect(entity.createdAt).toEqual(record.createdAt);
      expect(entity.updatedAt).toEqual(record.updatedAt);
    });
  });

  describe('toRecord', () => {
    it('should map all fields from domain entity to record', () => {
      const entity = new KnowledgeBase({
        id: randomUUID(),
        name: 'Bauordnung Musterstadt',
        description: 'Bauvorschriften und Genehmigungen',
        orgId: randomUUID(),
        userId: randomUUID(),
        createdAt: new Date('2025-05-10'),
        updatedAt: new Date('2025-05-20'),
      });

      const record = mapper.toRecord(entity);

      expect(record).toBeInstanceOf(KnowledgeBaseRecord);
      expect(record.id).toBe(entity.id);
      expect(record.name).toBe('Bauordnung Musterstadt');
      expect(record.description).toBe('Bauvorschriften und Genehmigungen');
      expect(record.orgId).toBe(entity.orgId);
      expect(record.userId).toBe(entity.userId);
      expect(record.createdAt).toEqual(entity.createdAt);
      expect(record.updatedAt).toEqual(entity.updatedAt);
    });
  });

  describe('round-trip', () => {
    it('should preserve all fields through domain → record → domain', () => {
      const original = new KnowledgeBase({
        id: randomUUID(),
        name: 'Haushaltspläne',
        description: 'Kommunale Haushaltsdokumente 2020-2025',
        orgId: randomUUID(),
        userId: randomUUID(),
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-06-15'),
      });

      const record = mapper.toRecord(original);
      const restored = mapper.toDomain(record);

      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.description).toBe(original.description);
      expect(restored.orgId).toBe(original.orgId);
      expect(restored.userId).toBe(original.userId);
      expect(restored.createdAt).toEqual(original.createdAt);
      expect(restored.updatedAt).toEqual(original.updatedAt);
    });
  });
});
