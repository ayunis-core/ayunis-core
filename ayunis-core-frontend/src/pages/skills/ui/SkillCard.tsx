import { Button } from '@/shared/ui/shadcn/button';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Trash2 } from 'lucide-react';
import { useDeleteSkill } from '../api/useDeleteSkill';
import { useToggleSkillActive } from '../api/useToggleSkillActive';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTranslation } from 'react-i18next';
import type { Skill } from '../model/openapi';
// TODO: Navigate to /skills/$id once the detail route exists (step 8)
// import { useRouter } from '@tanstack/react-router';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { Switch } from '@/shared/ui/shadcn/switch';

interface SkillCardProps {
  skill: Skill;
}

export default function SkillCard({ skill }: SkillCardProps) {
  const { t } = useTranslation('skills');
  const deleteSkill = useDeleteSkill();
  const toggleActive = useToggleSkillActive();
  const { confirm } = useConfirmation();

  function handleDelete() {
    confirm({
      title: t('card.confirmDelete.title'),
      description: t('card.confirmDelete.description', {
        title: skill.name,
      }),
      confirmText: t('card.confirmDelete.confirmText'),
      cancelText: t('card.confirmDelete.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        deleteSkill.mutate({ id: skill.id });
      },
    });
  }

  function handleToggleActive(e: React.MouseEvent) {
    e.stopPropagation();
    toggleActive.mutate({ id: skill.id });
  }

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>
          <span>{skill.name}</span>
          <Badge
            variant={skill.isActive ? 'default' : 'secondary'}
            className="ml-2 text-xs"
          >
            {skill.isActive ? t('card.active') : t('card.inactive')}
          </Badge>
        </ItemTitle>
        <ItemDescription>{skill.shortDescription}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Switch
            checked={skill.isActive}
            onClick={handleToggleActive}
            disabled={toggleActive.isPending}
          />
        </div>
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
      </ItemActions>
    </Item>
  );
}
