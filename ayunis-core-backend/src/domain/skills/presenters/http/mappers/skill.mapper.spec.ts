import type { UUID } from 'crypto';
import { SkillDtoMapper } from './skill.mapper';
import { Skill } from '../../../domain/skill.entity';

describe('SkillDtoMapper', () => {
  let mapper: SkillDtoMapper;

  const OWNER_ID = 'creator-1' as UUID;
  const skill = new Skill({
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Legal Research',
    shortDescription: 'Research legal topics',
    instructions: 'You are a legal research assistant.',
    userId: OWNER_ID,
  });

  beforeEach(() => {
    mapper = new SkillDtoMapper();
  });

  describe('toDto', () => {
    it('writes creatorName when the skill is shared and a name is supplied', () => {
      const dto = mapper.toDto(
        skill,
        { isActive: false, isShared: true, isPinned: false },
        'Florian Obermeier',
      );

      expect(dto.creatorName).toBe('Florian Obermeier');
      expect(dto.isShared).toBe(true);
    });

    it('writes null for creatorName when the skill is shared but the name was not resolved', () => {
      const dto = mapper.toDto(
        skill,
        { isActive: false, isShared: true, isPinned: false },
        null,
      );

      expect(dto.creatorName).toBeNull();
    });

    it('writes null for creatorName when the skill is shared and no name is supplied', () => {
      const dto = mapper.toDto(skill, {
        isActive: false,
        isShared: true,
        isPinned: false,
      });

      expect(dto.creatorName).toBeNull();
    });

    it('never writes creatorName for non-shared skills, even if one is supplied', () => {
      const dto = mapper.toDto(
        skill,
        { isActive: true, isShared: false, isPinned: false },
        'Florian Obermeier',
      );

      expect(dto.creatorName).toBeNull();
    });
  });

  describe('toDtoArray', () => {
    const sharedSkill = new Skill({
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Shared Skill',
      shortDescription: 'Shared',
      instructions: 'shared',
      userId: 'creator-2' as UUID,
    });

    it('looks up creatorName by skill.userId only for shared skills', () => {
      const dtos = mapper.toDtoArray(
        [skill, sharedSkill],
        new Set(),
        new Set([sharedSkill.id]),
        new Set(),
        new Map<UUID, string>([
          [OWNER_ID, 'Alice'],
          [sharedSkill.userId, 'Bob'],
        ]),
      );

      expect(dtos[0].isShared).toBe(false);
      expect(dtos[0].creatorName).toBeNull();
      expect(dtos[1].isShared).toBe(true);
      expect(dtos[1].creatorName).toBe('Bob');
    });

    it('writes null creatorName when the shared skill creator is missing from the map', () => {
      const dtos = mapper.toDtoArray(
        [sharedSkill],
        new Set(),
        new Set([sharedSkill.id]),
        new Set(),
        new Map<UUID, string>(),
      );

      expect(dtos[0].isShared).toBe(true);
      expect(dtos[0].creatorName).toBeNull();
    });
  });
});
