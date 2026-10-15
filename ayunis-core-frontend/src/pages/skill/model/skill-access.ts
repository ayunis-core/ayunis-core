import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export interface SkillAccess {
  canUse: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isCollective: boolean;
}

export function skillAccess(skill: SkillResponseDto): SkillAccess {
  const canEdit = skill.viewer?.canEdit ?? false;
  return {
    canUse: skill.viewer?.canUse ?? true,
    canEdit,
    canDelete: skill.viewer?.canDelete ?? canEdit,
    isCollective: skill.ownerType === 'team' || skill.ownerType === 'org',
  };
}
