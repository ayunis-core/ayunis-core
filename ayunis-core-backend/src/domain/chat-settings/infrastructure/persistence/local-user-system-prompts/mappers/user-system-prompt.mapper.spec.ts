import { UserSystemPromptMapper } from './user-system-prompt.mapper';
import { UserSystemPrompt } from '../../../../domain/user-system-prompt.entity';
import { UserSystemPromptRecord } from '../schema/user-system-prompt.record';
import { randomUUID } from 'crypto';

describe('UserSystemPromptMapper', () => {
  let mapper: UserSystemPromptMapper;

  beforeEach(() => {
    mapper = new UserSystemPromptMapper();
  });

  describe('round-trip: domain → record → domain', () => {
    it('should preserve all fields through a round-trip conversion', () => {
      const original = new UserSystemPrompt({
        id: randomUUID(),
        userId: randomUUID(),
        systemPrompt:
          'Always respond in bullet points. I work in the finance department.',
        createdAt: new Date('2026-01-15T10:00:00Z'),
        updatedAt: new Date('2026-02-10T14:30:00Z'),
      });

      const record = mapper.toRecord(original);
      const restored = mapper.toDomain(record);

      expect(restored.id).toEqual(original.id);
      expect(restored.userId).toEqual(original.userId);
      expect(restored.systemPrompt).toEqual(original.systemPrompt);
      expect(restored.createdAt).toEqual(original.createdAt);
      expect(restored.updatedAt).toEqual(original.updatedAt);
    });
  });

  describe('toDomain', () => {
    it('should convert a record to a UserSystemPrompt domain entity', () => {
      const record = new UserSystemPromptRecord();
      record.id = randomUUID();
      record.userId = randomUUID();
      record.systemPrompt = 'Please respond in German.';
      record.createdAt = new Date('2026-01-01T00:00:00Z');
      record.updatedAt = new Date('2026-01-02T00:00:00Z');

      const domain = mapper.toDomain(record);

      expect(domain).toBeInstanceOf(UserSystemPrompt);
      expect(domain.id).toEqual(record.id);
      expect(domain.userId).toEqual(record.userId);
      expect(domain.systemPrompt).toEqual(record.systemPrompt);
    });
  });

  describe('toRecord', () => {
    it('should convert a domain entity to a UserSystemPromptRecord', () => {
      const domain = new UserSystemPrompt({
        userId: randomUUID(),
        systemPrompt: 'Use formal language at all times.',
      });

      const record = mapper.toRecord(domain);

      expect(record).toBeInstanceOf(UserSystemPromptRecord);
      expect(record.id).toEqual(domain.id);
      expect(record.userId).toEqual(domain.userId);
      expect(record.systemPrompt).toEqual(domain.systemPrompt);
    });
  });
});
