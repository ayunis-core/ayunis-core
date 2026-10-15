import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import type { UUID } from 'crypto';
import { SkillDtoMapper } from './skill.mapper';

describe('SkillDtoMapper', () => {
  let mapper: SkillDtoMapper;

  const OWNER_ID = 'creator-1' as UUID;
  const skill = new PersonalSkill({
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
    it('exposes personal and workspace ownership without user IDs', () => {
      const workspaceId = '00000000-0000-0000-0000-000000000099' as UUID;
      const workspaceSkill = new WorkspaceSkill({
        workspaceId,
        name: 'Workspace skill',
        shortDescription: 'Workspace',
        instructions: 'Workspace instructions',
      });

      const personalDto = mapper.toDto(skill, {
        isActive: true,
        isPinned: false,
      });
      const workspaceDto = mapper.toDto(workspaceSkill, {
        isActive: true,
        isPinned: true,
      });

      expect(personalDto).toMatchObject({
        ownerType: 'personal',
        userId: OWNER_ID,
      });
      expect(workspaceDto).toMatchObject({
        ownerType: 'workspace',
        workspaceId,
      });
    });
  });
});
