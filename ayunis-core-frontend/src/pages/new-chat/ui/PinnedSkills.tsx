import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { useSkillsControllerFindAll } from '@/shared/api/generated/ayunisCoreAPI';
import { useIsSkillsEnabled } from '@/features/feature-toggles';

interface PinnedSkillsProps {
  onSkillSelect: (skillId: string, skillName: string) => void;
  selectedSkillId?: string;
}

export function PinnedSkills({
  onSkillSelect,
  selectedSkillId,
}: Readonly<PinnedSkillsProps>) {
  const { t } = useTranslation('common');
  const skillsEnabled = useIsSkillsEnabled();
  const { data: skills } = useSkillsControllerFindAll({
    query: { enabled: skillsEnabled },
  });

  const pinnedSkills = skills?.filter((skill) => skill.isPinned) ?? [];

  if (!skillsEnabled || pinnedSkills.length === 0) {
    return null;
  }

  return (
    <div className="flex justify-center items-center gap-2 flex-wrap">
      {pinnedSkills.map((skill) => (
        <Tooltip key={skill.id}>
          <TooltipTrigger asChild>
            <Button
              variant={selectedSkillId === skill.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSkillSelect(skill.id, skill.name)}
            >
              <Sparkles className="h-4 w-4" />
              {skill.name}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {selectedSkillId === skill.id
              ? t('pinnedSkills.deactivateTooltip')
              : t('pinnedSkills.activateTooltip')}
          </TooltipContent>
        </Tooltip>
      ))}
      <HelpLink
        path="skills/name-and-description/#f%C3%A4higkeiten-anheften--manuelle-aktivierung"
        variant="icon"
      />
    </div>
  );
}
