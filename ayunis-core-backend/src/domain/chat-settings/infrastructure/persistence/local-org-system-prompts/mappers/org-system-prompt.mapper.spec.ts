import { OrgSystemPromptMapper } from './org-system-prompt.mapper';
import { OrgSystemPrompt } from 'src/domain/chat-settings/domain/org-system-prompt.entity';
import { OrgSystemPromptRecord } from '../schema/org-system-prompt.record';
import { randomUUID } from 'crypto';

describe('OrgSystemPromptMapper', () => {
  let mapper: OrgSystemPromptMapper;

  beforeEach(() => {
    mapper = new OrgSystemPromptMapper();
  });

  describe('round-trip: domain → record → domain', () => {
    it('should preserve all fields through a round-trip conversion', () => {
      const original = new OrgSystemPrompt({
        id: randomUUID(),
        orgId: randomUUID(),
        systemPrompt:
          'All responses must comply with municipal communication guidelines.',
        createdAt: new Date('2026-01-15T10:00:00Z'),
        updatedAt: new Date('2026-02-10T14:30:00Z'),
      });

      const record = mapper.toRecord(original);
      const restored = mapper.toDomain(record);

      expect(restored.id).toEqual(original.id);
      expect(restored.orgId).toEqual(original.orgId);
      expect(restored.systemPrompt).toEqual(original.systemPrompt);
      expect(restored.createdAt).toEqual(original.createdAt);
      expect(restored.updatedAt).toEqual(original.updatedAt);
    });
  });

  describe('toDomain', () => {
    it('should convert a record to an OrgSystemPrompt domain entity', () => {
      const record = new OrgSystemPromptRecord();
      record.id = randomUUID();
      record.orgId = randomUUID();
      record.systemPrompt = 'Always answer in plain administrative German.';
      record.createdAt = new Date('2026-01-01T00:00:00Z');
      record.updatedAt = new Date('2026-01-02T00:00:00Z');

      const domain = mapper.toDomain(record);

      expect(domain).toBeInstanceOf(OrgSystemPrompt);
      expect(domain.id).toEqual(record.id);
      expect(domain.orgId).toEqual(record.orgId);
      expect(domain.systemPrompt).toEqual(record.systemPrompt);
    });
  });

  describe('toRecord', () => {
    it('should convert a domain entity to an OrgSystemPromptRecord', () => {
      const domain = new OrgSystemPrompt({
        orgId: randomUUID(),
        systemPrompt: 'Refer to citizens as "Bürgerinnen und Bürger".',
      });

      const record = mapper.toRecord(domain);

      expect(record).toBeInstanceOf(OrgSystemPromptRecord);
      expect(record.id).toEqual(domain.id);
      expect(record.orgId).toEqual(domain.orgId);
      expect(record.systemPrompt).toEqual(domain.systemPrompt);
    });
  });
});
