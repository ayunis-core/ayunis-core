import { useTranslation } from 'react-i18next';
import { Pin, Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Switch } from '@ayunis/ui/components/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function WorkspaceSkillRowActions({
  skill,
  isChangingState,
  onSetActive,
  onSetPinned,
  onDelete,
}: Readonly<{
  skill: SkillResponseDto;
  isChangingState: boolean;
  onSetActive: (isActive: boolean) => void;
  onSetPinned: (isPinned: boolean) => void;
  onDelete: () => void;
}>) {
  const { t } = useTranslation('workspace');
  const pinLabel = skill.isPinned
    ? t('context.skills.unpin')
    : t('context.skills.pin');

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {skill.isActive
            ? t('context.skills.active')
            : t('context.skills.inactive')}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Switch
                data-testid={`workspace-skill-active-${skill.id}`}
                checked={skill.isActive}
                disabled={isChangingState}
                onCheckedChange={onSetActive}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {t('context.skills.activeTooltip')}
          </TooltipContent>
        </Tooltip>
      </div>
      {skill.isActive ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid={`workspace-skill-pin-${skill.id}`}
              disabled={isChangingState}
              aria-label={pinLabel}
              onClick={() => onSetPinned(!skill.isPinned)}
            >
              <Pin className={skill.isPinned ? 'fill-current' : ''} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{pinLabel}</TooltipContent>
        </Tooltip>
      ) : null}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            aria-label={t('context.skills.delete')}
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('context.skills.delete')}</TooltipContent>
      </Tooltip>
    </>
  );
}
