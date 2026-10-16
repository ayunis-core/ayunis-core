import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pin, Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { SkillActiveSwitch, useSetSkillPin } from '@/features/skill-actions';
import { useLinkedDeleteHint } from '@/features/workspace-links';
import { useDeleteSkill } from '@/pages/skill/api';
import type { SkillAccess } from '@/pages/skill/model/skill-access';

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
  const deleteSkill = useDeleteSkill(skill.name);
  const linked = useLinkedDeleteHint('skill', skill.id, true);
  const { confirm } = useConfirmation();

  function handleDelete() {
    confirm({
      title: t('delete.confirmTitle'),
      description: t('delete.confirmDescription', {
        name: skill.name,
        hint: linked.hint,
      }),
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
          disabled={deleteSkill.isPending || !linked.isKnown}
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
  handoverAction,
}: Readonly<{
  skill: SkillResponseDto;
  access: SkillAccess;
  handoverAction?: ReactNode;
}>) {
  return (
    <>
      <HelpLink path="skills/" />
      {access.canUse && (
        <SkillActiveSwitch
          skillId={skill.id}
          isActive={skill.isActive}
          isMandatory={skill.isMandatory}
          testId="skill-detail-active"
        />
      )}
      {access.canUse && skill.isActive && <PinToggle skill={skill} />}
      {handoverAction}
      {access.canDelete && <DeleteButton skill={skill} />}
    </>
  );
}
