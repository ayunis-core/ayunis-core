import { AlwaysOnSkillTemplate } from '../../../../domain/always-on-skill-template.entity';
import { PreCreatedCopySkillTemplate } from '../../../../domain/pre-created-copy-skill-template.entity';
import type { SkillTemplate } from '../../../../domain/skill-template.entity';
import { DistributionMode } from '../../../../domain/distribution-mode.enum';
import type { SkillTemplateRecord } from '../schema/skill-template.record';
import { AlwaysOnSkillTemplateRecord } from '../schema/always-on-skill-template.record';
import { PreCreatedCopySkillTemplateRecord } from '../schema/pre-created-copy-skill-template.record';
import { SkillTemplateMapper } from './skill-template.mapper';
import type { UUID } from 'crypto';

describe('SkillTemplateMapper', () => {
  let mapper: SkillTemplateMapper;

  const mockId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

  beforeEach(() => {
    mapper = new SkillTemplateMapper();
  });

  describe('toDomain', () => {
    it('should map an AlwaysOnSkillTemplateRecord to AlwaysOnSkillTemplate', () => {
      const record = new AlwaysOnSkillTemplateRecord();
      record.id = mockId;
      record.name = 'Datenschutz-Richtlinie';
      record.shortDescription = 'Stellt Datenschutzkonformität sicher';
      record.instructions =
        'Achte bei allen Antworten auf den Datenschutz und die DSGVO.';
      record.isActive = true;
      record.createdAt = new Date('2026-01-01');
      record.updatedAt = new Date('2026-01-02');

      const domain = mapper.toDomain(record);

      expect(domain).toBeInstanceOf(AlwaysOnSkillTemplate);
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

    it('should map a PreCreatedCopySkillTemplateRecord to PreCreatedCopySkillTemplate', () => {
      const record = new PreCreatedCopySkillTemplateRecord();
      record.id = mockId;
      record.name = 'Willkommens-Skill';
      record.shortDescription = 'Begrüßt neue Nutzer';
      record.instructions = 'Begrüße den Nutzer freundlich.';
      record.isActive = false;
      record.defaultActive = true;
      record.defaultPinned = true;
      record.createdAt = new Date('2026-03-01');
      record.updatedAt = new Date('2026-03-01');

      const domain = mapper.toDomain(record);

      expect(domain).toBeInstanceOf(PreCreatedCopySkillTemplate);
      expect(domain.distributionMode).toBe(DistributionMode.PRE_CREATED_COPY);
      expect(domain.isActive).toBe(false);
      expect((domain as PreCreatedCopySkillTemplate).defaultActive).toBe(true);
      expect((domain as PreCreatedCopySkillTemplate).defaultPinned).toBe(true);
    });

    it('should treat null defaultActive/defaultPinned as false', () => {
      const record = new PreCreatedCopySkillTemplateRecord();
      record.id = mockId;
      record.name = 'Null-Defaults';
      record.shortDescription = 'Has null defaults';
      record.instructions = 'Test instructions.';
      record.isActive = false;
      record.defaultActive = null;
      record.defaultPinned = null;
      record.createdAt = new Date('2026-03-01');
      record.updatedAt = new Date('2026-03-01');

      const domain = mapper.toDomain(record) as PreCreatedCopySkillTemplate;

      expect(domain.defaultActive).toBe(false);
      expect(domain.defaultPinned).toBe(false);
    });

    it('should throw for unknown record type', () => {
      const record = {
        constructor: { name: 'UnknownRecord' },
      } as SkillTemplateRecord;

      expect(() => mapper.toDomain(record)).toThrow(
        'Unknown skill template record type: UnknownRecord',
      );
    });
  });

  describe('toRecord', () => {
    it('should map an AlwaysOnSkillTemplate to AlwaysOnSkillTemplateRecord', () => {
      const domain = new AlwaysOnSkillTemplate({
        id: mockId,
        name: 'Datenschutz-Richtlinie',
        shortDescription: 'Stellt Datenschutzkonformität sicher',
        instructions:
          'Achte bei allen Antworten auf den Datenschutz und die DSGVO.',
        isActive: true,
      });

      const record = mapper.toRecord(domain);

      expect(record).toBeInstanceOf(AlwaysOnSkillTemplateRecord);
      expect(record.id).toBe(mockId);
      expect(record.name).toBe('Datenschutz-Richtlinie');
      expect(record.isActive).toBe(true);
    });

    it('should null out defaultActive and defaultPinned for AlwaysOnSkillTemplate records', () => {
      const domain = new AlwaysOnSkillTemplate({
        id: mockId,
        name: 'Sicherheits-Richtlinie',
        shortDescription: 'Sicherheitsanweisungen',
        instructions: 'Befolge die Sicherheitsrichtlinien.',
        isActive: true,
      });

      const record = mapper.toRecord(domain);

      expect(record.defaultActive).toBeNull();
      expect(record.defaultPinned).toBeNull();
    });

    it('should map a PreCreatedCopySkillTemplate to PreCreatedCopySkillTemplateRecord', () => {
      const domain = new PreCreatedCopySkillTemplate({
        id: mockId,
        name: 'Willkommens-Skill',
        shortDescription: 'Begrüßt neue Nutzer',
        instructions: 'Begrüße den Nutzer freundlich.',
        isActive: true,
        defaultActive: true,
        defaultPinned: true,
      });

      const record = mapper.toRecord(domain);

      expect(record).toBeInstanceOf(PreCreatedCopySkillTemplateRecord);
      expect(record.id).toBe(mockId);
      expect(record.name).toBe('Willkommens-Skill');
      expect(record.isActive).toBe(true);
      expect((record as PreCreatedCopySkillTemplateRecord).defaultActive).toBe(
        true,
      );
      expect((record as PreCreatedCopySkillTemplateRecord).defaultPinned).toBe(
        true,
      );
    });

    it('should throw for unknown domain type', () => {
      const domain = {
        constructor: { name: 'UnknownEntity' },
      } as unknown as SkillTemplate;

      expect(() => mapper.toRecord(domain)).toThrow(
        'Unknown skill template type: UnknownEntity',
      );
    });
  });

  describe('round-trip', () => {
    it('should preserve all fields through AlwaysOnSkillTemplate → record → domain', () => {
      const original = new AlwaysOnSkillTemplate({
        id: mockId,
        name: 'Verwaltungs-Assistent',
        shortDescription: 'Unterstützt bei Verwaltungsaufgaben',
        instructions: 'Hilf bei kommunalen Verwaltungsaufgaben.',
        isActive: true,
        createdAt: new Date('2026-02-15'),
        updatedAt: new Date('2026-02-20'),
      });

      const record = mapper.toRecord(original);
      record.createdAt = original.createdAt;
      record.updatedAt = original.updatedAt;
      const restored = mapper.toDomain(record);

      expect(restored).toBeInstanceOf(AlwaysOnSkillTemplate);
      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.shortDescription).toBe(original.shortDescription);
      expect(restored.instructions).toBe(original.instructions);
      expect(restored.distributionMode).toBe(original.distributionMode);
      expect(restored.isActive).toBe(original.isActive);
      expect(restored.createdAt).toEqual(original.createdAt);
      expect(restored.updatedAt).toEqual(original.updatedAt);
    });

    it('should preserve all fields through PreCreatedCopySkillTemplate → record → domain', () => {
      const original = new PreCreatedCopySkillTemplate({
        id: mockId,
        name: 'Begrüßungs-Skill',
        shortDescription: 'Begrüßt Nutzer',
        instructions: 'Begrüße den Nutzer.',
        isActive: true,
        defaultActive: true,
        defaultPinned: false,
        createdAt: new Date('2026-02-15'),
        updatedAt: new Date('2026-02-20'),
      });

      const record = mapper.toRecord(original);
      record.createdAt = original.createdAt;
      record.updatedAt = original.updatedAt;
      const restored = mapper.toDomain(record) as PreCreatedCopySkillTemplate;

      expect(restored).toBeInstanceOf(PreCreatedCopySkillTemplate);
      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.shortDescription).toBe(original.shortDescription);
      expect(restored.instructions).toBe(original.instructions);
      expect(restored.distributionMode).toBe(original.distributionMode);
      expect(restored.isActive).toBe(original.isActive);
      expect(restored.defaultActive).toBe(original.defaultActive);
      expect(restored.defaultPinned).toBe(original.defaultPinned);
      expect(restored.createdAt).toEqual(original.createdAt);
      expect(restored.updatedAt).toEqual(original.updatedAt);
    });
  });
});
