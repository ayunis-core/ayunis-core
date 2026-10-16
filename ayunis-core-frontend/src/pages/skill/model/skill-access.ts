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

export function skillContentMode(
  skill: SkillResponseDto,
  isReviewing: boolean,
): { isReadOnly: boolean; linksResources: boolean } {
  const { canUse, canEdit, isCollective } = skillAccess(skill);
  const isOthersPersonal = skill.ownerType === 'personal' && !canUse;
  return {
    isReadOnly: (isCollective && !canEdit) || isOthersPersonal || isReviewing,
    linksResources: !isCollective && !isOthersPersonal && !isReviewing,
  };
}
