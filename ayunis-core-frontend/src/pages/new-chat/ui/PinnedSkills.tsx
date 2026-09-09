import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import {
  useSkillsControllerFindAll,
  useWorkspaceContextControllerFindContext,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useIsSkillsEnabled } from '@/features/feature-toggles';
import { personalSkillListParams } from '@/shared/api/skill-scopes';

interface PinnedSkillsProps {
  onSkillSelect: (
    skillId: string,
    skillName: string,
    workspaceId?: string,
  ) => void;
  selectedSkillId?: string;
  workspaceId?: string | null;
}

export function PinnedSkills({
  onSkillSelect,
  selectedSkillId,
  workspaceId,
}: Readonly<PinnedSkillsProps>) {
  const { t } = useTranslation('common');
  const skillsEnabled = useIsSkillsEnabled();
  const { data: skillsResponse } = useSkillsControllerFindAll(
    personalSkillListParams,
    { query: { enabled: skillsEnabled } },
  );
  const workspaceQuery = useWorkspaceContextControllerFindContext(
    workspaceId ?? '',
    {
      query: { enabled: skillsEnabled && Boolean(workspaceId) },
    },
  );
  const pinnedSkills = [
    ...(skillsResponse?.data.filter((skill) => skill.isPinned) ?? []),
    ...(workspaceId
      ? (workspaceQuery.data?.skills.filter(
          (skill) => skill.isActive && skill.isPinned,
        ) ?? [])
      : []),
  ];

  if (!skillsEnabled) return null;

  const skillsHelpPath =
    'skills/name-and-description/#f%C3%A4higkeiten-anheften--manuelle-aktivierung';
  const showPinHint =
    pinnedSkills.length === 0 &&
    (!workspaceId || (!workspaceQuery.isPending && !workspaceQuery.isError));

  return (
    <div className="flex justify-center items-center gap-2 flex-wrap">
      {pinnedSkills.map((skill) => (
        <Tooltip key={skill.id}>
          <TooltipTrigger asChild>
            <Button
              variant={selectedSkillId === skill.id ? 'default' : 'outline'}
              size="sm"
              aria-pressed={selectedSkillId === skill.id}
              data-testid={`pinned-skill-${skill.id}`}
              onClick={() =>
                onSkillSelect(
                  skill.id,
                  skill.name,
                  'workspaceId' in skill ? skill.workspaceId : undefined,
                )
              }
            >
              <Sparkles className="h-4 w-4" />
              {skill.name}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('pinnedSkills.activateTooltip')}</TooltipContent>
        </Tooltip>
      ))}
      {workspaceId && workspaceQuery.isPending && (
        <span role="status" className="text-xs text-muted-foreground">
          {t('common.loading')}
        </span>
      )}
      {workspaceId && workspaceQuery.isError && (
        <span role="alert" className="text-xs text-muted-foreground">
          {t('pinnedSkills.projectLoadError')}
        </span>
      )}
      {showPinHint ? (
        <HelpLink path={skillsHelpPath} label={t('pinnedSkills.pinHint')} />
      ) : (
        <HelpLink path={skillsHelpPath} variant="icon" />
      )}
    </div>
  );
}
