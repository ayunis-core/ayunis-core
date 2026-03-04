import { SkillTemplate } from '../../../../domain/skill-template.entity';
import { SkillTemplateRecord } from '../schema/skill-template.record';
import { SkillTemplateMapper } from './skill-template.mapper';
import { DistributionMode } from '../../../../domain/distribution-mode.enum';
import type { UUID } from 'crypto';

describe('SkillTemplateMapper', () => {
  let mapper: SkillTemplateMapper;

  const mockId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

  beforeEach(() => {
    mapper = new SkillTemplateMapper();
  });

  describe('toDomain', () => {
    it('should map a SkillTemplateRecord to SkillTemplate domain entity', () => {
      const record = new SkillTemplateRecord();
      record.id = mockId;
      record.name = 'Datenschutz-Richtlinie';
      record.shortDescription = 'Stellt Datenschutzkonformität sicher';
      record.instructions =
        'Achte bei allen Antworten auf den Datenschutz und die DSGVO.';
      record.distributionMode = DistributionMode.ALWAYS_ON;
      record.isActive = true;
      record.createdAt = new Date('2026-01-01');
      record.updatedAt = new Date('2026-01-02');

      const domain = mapper.toDomain(record);

      expect(domain.id).toBe(mockId);
      expect(domain.name).toBe('Datenschutz-Richtlinie');
      expect(domain.shortDescription).toBe(
        'Stellt Datenschutzkonformität sicher',
      );
      expect(domain.instructions).toBe(
        'Achte bei allen Antworten auf den Datenschutz und die DSGVO.',
      );
      expect(domain.distributionMode).toBe(DistributionMode.ALWAYS_ON);
      expect(domain.isActive).toBe(true);
      expect(domain.createdAt).toEqual(new Date('2026-01-01'));
      expect(domain.updatedAt).toEqual(new Date('2026-01-02'));
    });

    it('should map a record with pre_created_copy mode', () => {
      const record = new SkillTemplateRecord();
      record.id = mockId;
      record.name = 'Willkommens-Skill';
      record.shortDescription = 'Begrüßt neue Nutzer';
      record.instructions = 'Begrüße den Nutzer freundlich.';
      record.distributionMode = DistributionMode.PRE_CREATED_COPY;
      record.isActive = false;
      record.createdAt = new Date('2026-03-01');
      record.updatedAt = new Date('2026-03-01');

      const domain = mapper.toDomain(record);

      expect(domain.distributionMode).toBe(DistributionMode.PRE_CREATED_COPY);
      expect(domain.isActive).toBe(false);
    });
  });

  describe('toRecord', () => {
    it('should map a SkillTemplate domain entity to SkillTemplateRecord', () => {
      const domain = new SkillTemplate({
        id: mockId,
        name: 'Datenschutz-Richtlinie',
        shortDescription: 'Stellt Datenschutzkonformität sicher',
        instructions:
          'Achte bei allen Antworten auf den Datenschutz und die DSGVO.',
        distributionMode: DistributionMode.ALWAYS_ON,
        isActive: true,
      });

      const record = mapper.toRecord(domain);

      expect(record.id).toBe(mockId);
      expect(record.name).toBe('Datenschutz-Richtlinie');
      expect(record.shortDescription).toBe(
        'Stellt Datenschutzkonformität sicher',
      );
      expect(record.instructions).toBe(
        'Achte bei allen Antworten auf den Datenschutz und die DSGVO.',
      );
      expect(record.distributionMode).toBe(DistributionMode.ALWAYS_ON);
      expect(record.isActive).toBe(true);
    });
  });

  describe('round-trip', () => {
    it('should preserve all fields through domain → record → domain', () => {
      const original = new SkillTemplate({
        id: mockId,
        name: 'Verwaltungs-Assistent',
        shortDescription: 'Unterstützt bei Verwaltungsaufgaben',
        instructions: 'Hilf bei kommunalen Verwaltungsaufgaben.',
        distributionMode: DistributionMode.PRE_CREATED_COPY,
        isActive: true,
        createdAt: new Date('2026-02-15'),
        updatedAt: new Date('2026-02-20'),
      });

      const record = mapper.toRecord(original);
      // Simulate DB returning timestamps
      record.createdAt = original.createdAt;
      record.updatedAt = original.updatedAt;
      const restored = mapper.toDomain(record);

      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.shortDescription).toBe(original.shortDescription);
      expect(restored.instructions).toBe(original.instructions);
      expect(restored.distributionMode).toBe(original.distributionMode);
      expect(restored.isActive).toBe(original.isActive);
      expect(restored.createdAt).toEqual(original.createdAt);
      expect(restored.updatedAt).toEqual(original.updatedAt);
    });
  });
});
