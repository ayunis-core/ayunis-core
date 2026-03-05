import type { UUID } from 'crypto';
import { SkillTemplateResponseMapper } from './skill-template-response.mapper';
import { AlwaysOnSkillTemplate } from '../../../domain/always-on-skill-template.entity';
import { PreCreatedCopySkillTemplate } from '../../../domain/pre-created-copy-skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';

describe('SkillTemplateResponseMapper', () => {
  const mapper = new SkillTemplateResponseMapper();

  const mockId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const createdAt = new Date('2026-01-15T10:00:00Z');
  const updatedAt = new Date('2026-02-20T14:30:00Z');

  describe('toDto', () => {
    it('should map AlwaysOnSkillTemplate with defaultActive and defaultPinned as null', () => {
      const entity = new AlwaysOnSkillTemplate({
        id: mockId,
        name: 'Security Policy',
        shortDescription: 'Enforce security best practices',
        instructions: 'Always validate user input before processing.',
        isActive: true,
        createdAt,
        updatedAt,
      });

      const dto = mapper.toDto(entity);

      expect(dto.id).toBe(mockId);
      expect(dto.name).toBe('Security Policy');
      expect(dto.shortDescription).toBe('Enforce security best practices');
      expect(dto.instructions).toBe(
        'Always validate user input before processing.',
      );
      expect(dto.distributionMode).toBe(DistributionMode.ALWAYS_ON);
      expect(dto.isActive).toBe(true);
      expect(dto.defaultActive).toBeNull();
      expect(dto.defaultPinned).toBeNull();
      expect(dto.createdAt).toBe(createdAt);
      expect(dto.updatedAt).toBe(updatedAt);
    });

    it('should map PreCreatedCopySkillTemplate with actual defaultActive and defaultPinned values', () => {
      const entity = new PreCreatedCopySkillTemplate({
        id: mockId,
        name: 'Legal Guidelines',
        shortDescription: 'Legal compliance instructions',
        instructions: 'Follow legal guidelines when responding.',
        isActive: false,
        defaultActive: true,
        defaultPinned: true,
        createdAt,
        updatedAt,
      });

      const dto = mapper.toDto(entity);

      expect(dto.id).toBe(mockId);
      expect(dto.name).toBe('Legal Guidelines');
      expect(dto.shortDescription).toBe('Legal compliance instructions');
      expect(dto.instructions).toBe('Follow legal guidelines when responding.');
      expect(dto.distributionMode).toBe(DistributionMode.PRE_CREATED_COPY);
      expect(dto.isActive).toBe(false);
      expect(dto.defaultActive).toBe(true);
      expect(dto.defaultPinned).toBe(true);
      expect(dto.createdAt).toBe(createdAt);
      expect(dto.updatedAt).toBe(updatedAt);
    });

    it('should map PreCreatedCopySkillTemplate with false defaults', () => {
      const entity = new PreCreatedCopySkillTemplate({
        id: mockId,
        name: 'Onboarding Helper',
        shortDescription: 'Help new users get started',
        instructions: 'Guide users through the onboarding process.',
        defaultActive: false,
        defaultPinned: false,
        createdAt,
        updatedAt,
      });

      const dto = mapper.toDto(entity);

      expect(dto.defaultActive).toBe(false);
      expect(dto.defaultPinned).toBe(false);
    });
  });

  describe('toDtoArray', () => {
    it('should map an array of mixed template types', () => {
      const alwaysOn = new AlwaysOnSkillTemplate({
        id: mockId,
        name: 'Security Policy',
        shortDescription: 'Security instructions',
        instructions: 'Be secure.',
        createdAt,
        updatedAt,
      });

      const preCreated = new PreCreatedCopySkillTemplate({
        id: '223e4567-e89b-12d3-a456-426614174001' as UUID,
        name: 'Legal Guidelines',
        shortDescription: 'Legal instructions',
        instructions: 'Be legal.',
        defaultActive: true,
        defaultPinned: false,
        createdAt,
        updatedAt,
      });

      const dtos = mapper.toDtoArray([alwaysOn, preCreated]);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].defaultActive).toBeNull();
      expect(dtos[0].defaultPinned).toBeNull();
      expect(dtos[1].defaultActive).toBe(true);
      expect(dtos[1].defaultPinned).toBe(false);
    });
  });
});
