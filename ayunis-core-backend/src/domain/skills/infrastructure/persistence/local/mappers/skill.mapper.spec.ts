import { Skill } from '../../../../domain/skill.entity';
import { SkillRecord } from '../schema/skill.record';
import { SkillMapper } from './skill.mapper';
import { UUID } from 'crypto';

describe('SkillMapper', () => {
  let mapper: SkillMapper;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockSkillId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
  const mockSourceId = '770e8400-e29b-41d4-a716-446655440000' as UUID;
  const mockMcpId = '660e8400-e29b-41d4-a716-446655440000' as UUID;

  beforeEach(() => {
    mapper = new SkillMapper();
  });

  describe('toDomain', () => {
    it('should map a SkillRecord to Skill domain entity', () => {
      const record = new SkillRecord();
      record.id = mockSkillId;
      record.name = 'Legal Research';
      record.shortDescription = 'Research legal topics.';
      record.instructions = 'You are a legal research assistant.';
      record.userId = mockUserId;
      record.sources = [{ id: mockSourceId } as any];
      record.mcpIntegrations = [{ id: mockMcpId } as any];
      record.createdAt = new Date('2026-01-01');
      record.updatedAt = new Date('2026-01-02');

      const domain = mapper.toDomain(record);

      expect(domain.id).toBe(mockSkillId);
      expect(domain.name).toBe('Legal Research');
      expect(domain.shortDescription).toBe('Research legal topics.');
      expect(domain.instructions).toBe('You are a legal research assistant.');
      expect(domain.userId).toBe(mockUserId);
      expect(domain.sourceIds).toEqual([mockSourceId]);
      expect(domain.mcpIntegrationIds).toEqual([mockMcpId]);
      expect(domain.createdAt).toEqual(new Date('2026-01-01'));
      expect(domain.updatedAt).toEqual(new Date('2026-01-02'));
    });

    it('should default to empty arrays when relations are undefined', () => {
      const record = new SkillRecord();
      record.id = mockSkillId;
      record.name = 'Minimal Skill';
      record.shortDescription = 'Short.';
      record.instructions = 'Instructions.';
      record.userId = mockUserId;
      record.createdAt = new Date('2026-01-01');
      record.updatedAt = new Date('2026-01-02');

      const domain = mapper.toDomain(record);

      expect(domain.sourceIds).toEqual([]);
      expect(domain.mcpIntegrationIds).toEqual([]);
    });
  });

  describe('toRecord', () => {
    it('should map a Skill domain entity to SkillRecord', () => {
      const domain = new Skill({
        id: mockSkillId,
        name: 'Legal Research',
        shortDescription: 'Research legal topics.',
        instructions: 'You are a legal research assistant.',
        userId: mockUserId,
        sourceIds: [mockSourceId],
        mcpIntegrationIds: [mockMcpId],
      });

      const record = mapper.toRecord(domain);

      expect(record.id).toBe(mockSkillId);
      expect(record.name).toBe('Legal Research');
      expect(record.shortDescription).toBe('Research legal topics.');
      expect(record.instructions).toBe('You are a legal research assistant.');
      expect(record.userId).toBe(mockUserId);
    });
  });
});
