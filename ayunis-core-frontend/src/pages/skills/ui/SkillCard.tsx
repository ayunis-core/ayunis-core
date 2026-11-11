import { Button } from '@ayunis/ui/components/button';
import { Switch } from '@ayunis/ui/components/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { Trash2, Pin } from 'lucide-react';
import { useDeleteSkill } from '@/pages/skills/api/useDeleteSkill';
import { PermissionGate } from '@/features/permissions';
import {
  useSetSkillActivation,
  useSetSkillPin,
} from '@/features/skill-actions';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTranslation } from 'react-i18next';
import type { Skill } from '@/pages/skills/model/openapi';
import { useRouter } from '@tanstack/react-router';
import { SkillListItem } from '@/shared/ui/skill-list-item';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import { useResourceOwnership } from '@/features/resource-ownership';

interface SkillCardProps {
  skill: Skill;
  /** Anchor the "pin a skill" onboarding tour spotlight on this card's pin button. */
  pinTourTarget?: boolean;
}

export default function SkillCard({
  skill,
  pinTourTarget = false,
}: Readonly<SkillCardProps>) {
  const { t } = useTranslation('skills');
  const { t: tOwnership } = useTranslation('ownership');
  const deleteSkill = useDeleteSkill();
  const setActivation = useSetSkillActivation();
  const setPin = useSetSkillPin();
  const { confirm } = useConfirmation();
  const router = useRouter();
  const { canManage } = useResourceOwnership('skill');
  const isCollective = skill.ownerType === 'team' || skill.ownerType === 'org';
  // Team and organization state is global, so only managers may switch it.
  const canSetState = !isCollective || canManage(skill);

  function handleDelete() {
    confirm({
      title: t('card.confirmDelete.title'),
      description: t('card.confirmDelete.description', { title: skill.name }),
      confirmText: t('card.confirmDelete.confirmText'),
      cancelText: t('card.confirmDelete.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        deleteSkill.mutate({ id: skill.id });
      },
    });
  }

  function handleToggleActive() {
    setActivation.mutate({ id: skill.id, isActive: !skill.isActive });
  }

  function handleTogglePinned() {
    setPin.mutate({ id: skill.id, isPinned: !skill.isPinned });
  }

  function handleNavigateToDetail() {
    void router.navigate({ to: '/skills/$id', params: { id: skill.id } });
  }

  const pinButton =
    skill.isActive && canSetState ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePinned();
            }}
            disabled={setPin.isPending}
            aria-label={
              skill.isPinned ? t('card.unpinLabel') : t('card.pinLabel')
            }
          >
            <Pin
              className={`h-4 w-4 ${skill.isPinned ? 'fill-current' : ''}`}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {skill.isPinned ? t('card.unpinLabel') : t('card.pinLabel')}
        </TooltipContent>
      </Tooltip>
    ) : null;

  return (
    <SkillListItem
      testId={`skill-card-${skill.id}`}
      title={skill.name}
      description={skill.shortDescription}
      onClick={handleNavigateToDetail}
      actions={
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {skill.isActive ? t('card.activeLabel') : t('card.inactiveLabel')}
            </span>
            {isCollective ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Switch
                      checked={skill.isActive}
                      onCheckedChange={handleToggleActive}
                      disabled={setActivation.isPending || !canSetState}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {tOwnership('activation.managedByOwner')}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Switch
                checked={skill.isActive}
                onCheckedChange={handleToggleActive}
                disabled={setActivation.isPending || !canSetState}
              />
            )}
          </div>
          {pinButton &&
            (pinTourTarget ? (
              <OnboardingTourTarget name={TOUR_TARGET.pinSkill}>
                {pinButton}
              </OnboardingTourTarget>
            ) : (
              pinButton
            ))}
          {(!isCollective || canManage(skill)) && (
            <PermissionGate permission="manage_skills">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={handleDelete}
                    disabled={deleteSkill.isPending}
                    aria-label={t('card.deleteLabel')}
                  >
                    <Trash2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('card.deleteLabel')}</TooltipContent>
              </Tooltip>
            </PermissionGate>
          )}
        </>
      }
    />
  );
}
