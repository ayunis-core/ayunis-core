import { Button } from '@ayunis/ui/components/button';
import { Badge } from '@ayunis/ui/components/badge';
import { Switch } from '@ayunis/ui/components/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { Trash2 } from 'lucide-react';
import { useDeleteSkill } from '@/pages/skills/api/useDeleteSkill';
import { PermissionGate } from '@/features/permissions';
import { useSetSkillActivation } from '@/features/skill-actions';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTranslation } from 'react-i18next';
import type { Skill } from '@/pages/skills/model/openapi';
import { useRouter } from '@tanstack/react-router';
import { SkillListItem } from '@/shared/ui/skill-list-item';

interface SkillCardProps {
  skill: Skill;
}

export default function SkillCard({ skill }: Readonly<SkillCardProps>) {
  const { t } = useTranslation('skills');
  const deleteSkill = useDeleteSkill();
  const setActivation = useSetSkillActivation();
  const { confirm } = useConfirmation();
  const router = useRouter();

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

  function handleNavigateToDetail() {
    void router.navigate({ to: '/skills/$id', params: { id: skill.id } });
  }

  return (
    <SkillListItem
      testId={`skill-card-${skill.id}`}
      title={
        <>
          <span>{skill.name}</span>
          {skill.isShared && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {t('shared.badge')}
            </Badge>
          )}
          {skill.isShared && skill.creatorName && (
            <span className="text-xs text-muted-foreground">
              {t('shared.by', { name: skill.creatorName })}
            </span>
          )}
        </>
      }
      description={skill.shortDescription}
      onClick={handleNavigateToDetail}
      actions={
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {skill.isActive ? t('card.activeLabel') : t('card.inactiveLabel')}
            </span>
            <Switch
              checked={skill.isActive}
              onCheckedChange={handleToggleActive}
              disabled={setActivation.isPending}
            />
          </div>
          {!skill.isShared && (
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
