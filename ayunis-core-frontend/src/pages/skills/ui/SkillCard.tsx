import { Button } from '@/shared/ui/shadcn/button';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Switch } from '@/shared/ui/shadcn/switch';
import { Trash2 } from 'lucide-react';
import { useDeleteSkill } from '../api/useDeleteSkill';
import { useToggleSkillActive } from '../api/useToggleSkillActive';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTranslation } from 'react-i18next';
import type { Skill } from '../model/openapi';
import { useRouter } from '@tanstack/react-router';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';

interface SkillCardProps {
  skill: Skill;
}

export default function SkillCard({ skill }: Readonly<SkillCardProps>) {
  const { t } = useTranslation('skills');
  const deleteSkill = useDeleteSkill();
  const toggleActive = useToggleSkillActive();
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
    toggleActive.mutate({ id: skill.id });
  }

  function handleNavigateToDetail() {
    void router.navigate({ to: '/skills/$id', params: { id: skill.id } });
  }

  return (
    <Item
      variant="outline"
      className="cursor-pointer"
      onClick={handleNavigateToDetail}
    >
      <ItemContent>
        <ItemTitle>
          <span>{skill.name}</span>
          {skill.isShared && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {t('shared.badge')}
            </Badge>
          )}
          <Badge
            variant={skill.isActive ? 'default' : 'secondary'}
            className="ml-2 text-xs"
          >
            {skill.isActive ? t('badge.active') : t('badge.inactive')}
          </Badge>
        </ItemTitle>
        <ItemDescription>{skill.shortDescription}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {skill.isActive ? t('card.activeLabel') : t('card.inactiveLabel')}
          </span>
          <Switch
            checked={skill.isActive}
            onCheckedChange={handleToggleActive}
            disabled={toggleActive.isPending}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        {!skill.isShared && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={deleteSkill.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </ItemActions>
    </Item>
  );
}
