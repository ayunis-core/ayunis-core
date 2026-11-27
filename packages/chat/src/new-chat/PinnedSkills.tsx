import { CircleHelp, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';

export interface PinnedSkill {
  readonly id: string;
  readonly name: string;
  readonly workspaceId?: string;
}

interface PinnedSkillsProps {
  readonly skills: readonly PinnedSkill[];
  /** Whether the selected workspace's pins have loaded. */
  readonly status: 'loading' | 'error' | 'ready';
  readonly helpUrl: string;
  readonly selectedId?: string;
  readonly disabled: boolean;
  readonly onSelect: (skill: PinnedSkill) => void;
}

function PinHelpLink({
  url,
  withLabel,
}: Readonly<{ url: string; withLabel: boolean }>) {
  const { t } = useTranslation('common');
  if (withLabel) {
    const label = t('pinnedSkills.pinHint');
    return (
      <Button variant="outline" size="sm" asChild>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <CircleHelp className="h-4 w-4" />
          <span className="max-sm:sr-only">{label}</span>
        </a>
      </Button>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <CircleHelp className="h-4 w-4" />
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('common.helpLink')}</TooltipContent>
    </Tooltip>
  );
}

/** Quick picks for the skill the new chat starts with. */
export function PinnedSkills({
  skills,
  status,
  helpUrl,
  selectedId,
  disabled,
  onSelect,
}: PinnedSkillsProps) {
  const { t } = useTranslation('common');
  return (
    <div className="flex justify-center items-center gap-2 flex-wrap">
      {skills.map((skill) => (
        <Tooltip key={skill.id}>
          <TooltipTrigger asChild>
            <Button
              variant={selectedId === skill.id ? 'default' : 'outline'}
              size="sm"
              disabled={disabled}
              aria-pressed={selectedId === skill.id}
              data-testid={`pinned-skill-${skill.id}`}
              onClick={() => onSelect(skill)}
            >
              <Sparkles className="h-4 w-4" />
              {skill.name}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('pinnedSkills.activateTooltip')}</TooltipContent>
        </Tooltip>
      ))}
      {status === 'loading' && (
        <span role="status" className="text-xs text-muted-foreground">
          {t('common.loading')}
        </span>
      )}
      {status === 'error' && (
        <span role="alert" className="text-xs text-muted-foreground">
          {t('pinnedSkills.projectLoadError')}
        </span>
      )}
      <PinHelpLink
        url={helpUrl}
        withLabel={skills.length === 0 && status === 'ready'}
      />
    </div>
  );
}
