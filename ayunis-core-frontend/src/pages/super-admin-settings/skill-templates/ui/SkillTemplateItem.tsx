import { useTranslation } from 'react-i18next';
import type { SkillTemplateResponseDto } from '@/shared/api';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemActions,
} from '@/shared/ui/shadcn/item';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/shadcn/button';
import { Switch } from '@/shared/ui/shadcn/switch';
import { Pencil, Trash2 } from 'lucide-react';

interface SkillTemplateItemProps {
  template: SkillTemplateResponseDto;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
  isDeleting: boolean;
  isToggling: boolean;
}

export function SkillTemplateItem({
  template,
  onEdit,
  onDelete,
  onToggleEnabled,
  isDeleting,
  isToggling,
}: Readonly<SkillTemplateItemProps>) {
  const { t } = useTranslation('super-admin-settings-skills');

  return (
    <Item>
      <ItemContent>
        <ItemTitle>{template.name}</ItemTitle>
        <ItemDescription>{template.shortDescription}</ItemDescription>
      </ItemContent>
      <ItemContent>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">
            {t(`distributionMode.${template.distributionMode}`)}
          </Badge>
        </div>
      </ItemContent>
      <ItemActions>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {template.isActive ? t('status.active') : t('status.inactive')}
          </span>
          <Switch
            checked={template.isActive}
            onCheckedChange={onToggleEnabled}
            disabled={isToggling}
            aria-label={
              template.isActive ? t('status.active') : t('status.inactive')
            }
          />
        </div>
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost-destructive"
          size="icon"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </ItemActions>
    </Item>
  );
}
