import { useNavigate } from '@tanstack/react-router';
import { SubmittedByLabel } from '@/features/resource-ownership';
import { SkillActiveSwitch } from '@/features/skill-actions';
import type { Skill } from '@/pages/skills/model/openapi';
import { SkillListItem } from '@/shared/ui/skill-list-item';

export function SkillRow({
  skill,
  showSubmittedBy = false,
}: Readonly<{ skill: Skill; showSubmittedBy?: boolean }>) {
  const navigate = useNavigate();
  const canUse = skill.viewer?.canUse ?? true;

  return (
    <SkillListItem
      testId={`skill-card-${skill.id}`}
      title={skill.name}
      description={skill.shortDescription}
      onClick={() =>
        void navigate({ to: '/skills/$id', params: { id: skill.id } })
      }
      actions={
        <>
          {showSubmittedBy && (
            <SubmittedByLabel
              kind="skill"
              resource={skill}
              testId={`skill-submitted-by-${skill.id}`}
            />
          )}
          {canUse && (
            <SkillActiveSwitch
              skillId={skill.id}
              isActive={skill.isActive}
              isMandatory={skill.isMandatory}
              testId={`skill-active-${skill.id}`}
            />
          )}
        </>
      }
    />
  );
}
