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
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { useConfirmation } from '@/widgets/confirmation-modal';
import {
  useSetSkillActivation,
  useSetSkillPin,
} from '@/features/skill-actions';
import { useDeleteSkill } from '@/pages/skill/api';
import type { SkillAccess } from '@/pages/skill/model/skill-access';

function ActiveSwitch({ skill }: Readonly<{ skill: SkillResponseDto }>) {
  const { t } = useTranslation('skills');
  const setActivation = useSetSkillActivation();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {skill.isActive ? t('card.activeLabel') : t('card.inactiveLabel')}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Switch
              checked={skill.isActive}
              onCheckedChange={() =>
                setActivation.mutate({
                  id: skill.id,
                  isActive: !skill.isActive,
                })
              }
              disabled={setActivation.isPending}
              aria-label={t('card.activeSwitchLabel')}
              data-testid="skill-detail-active"
            />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {t('card.activeTooltip')}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function PinToggle({ skill }: Readonly<{ skill: SkillResponseDto }>) {
  const { t } = useTranslation('skills');
  const setPin = useSetSkillPin();
  const label = skill.isPinned ? t('card.unpinLabel') : t('card.pinLabel');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            setPin.mutate({ id: skill.id, isPinned: !skill.isPinned })
          }
          disabled={setPin.isPending}
          aria-label={label}
        >
          <Pin className={`h-4 w-4 ${skill.isPinned ? 'fill-current' : ''}`} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function DeleteButton({ skill }: Readonly<{ skill: SkillResponseDto }>) {
  const { t } = useTranslation('skill');
  const { t: tSkills } = useTranslation('skills');
  const deleteSkill = useDeleteSkill();
  const { confirm } = useConfirmation();

  function handleDelete() {
    confirm({
      title: t('delete.confirmTitle'),
      description: t('delete.confirmDescription', { name: skill.name }),
      confirmText: t('delete.confirmText'),
      cancelText: t('delete.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        deleteSkill.mutate({ id: skill.id });
      },
    });
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={deleteSkill.isPending}
          aria-label={tSkills('card.deleteLabel')}
          data-testid="skill-detail-delete"
        >
          <Trash2 />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tSkills('card.deleteLabel')}</TooltipContent>
    </Tooltip>
  );
}

export function SkillHeaderActions({
  skill,
  access,
}: Readonly<{ skill: SkillResponseDto; access: SkillAccess }>) {
  return (
    <>
      <HelpLink path="skills/" />
      {access.canUse && <ActiveSwitch skill={skill} />}
      {access.canUse && skill.isActive && <PinToggle skill={skill} />}
      {access.canDelete && <DeleteButton skill={skill} />}
    </>
  );
}
