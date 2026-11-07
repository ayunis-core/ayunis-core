import { useTranslation } from 'react-i18next';
import { Globe, Pencil, Play, Trash2 } from 'lucide-react';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Switch } from '@ayunis/ui/components/switch';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useDeleteRoutine } from '@/pages/routines/api/useDeleteRoutine';
import { useRunRoutineNow } from '@/pages/routines/api/useRunRoutineNow';
import { useUpdateRoutine } from '@/pages/routines/api/useUpdateRoutine';
import type { Routine } from '@/pages/routines/model/openapi';
import { RoutineRunStatus } from '@/pages/routines/model/openapi';
import { RoutineRunStatusLine } from './RoutineRunStatusLine';

interface RoutineCardProps {
  routine: Routine;
  onEdit: () => void;
}

export default function RoutineCard({
  routine,
  onEdit,
}: Readonly<RoutineCardProps>) {
  const { t } = useTranslation('routines');
  const { confirm } = useConfirmation();
  const deleteRoutine = useDeleteRoutine();
  const runNow = useRunRoutineNow();
  const { updateRoutine, isUpdating } = useUpdateRoutine();
  const isRunActive =
    routine.lastRunStatus === RoutineRunStatus.queued ||
    routine.lastRunStatus === RoutineRunStatus.running;

  const handleDelete = () =>
    confirm({
      title: t('delete.title'),
      description: t('delete.description', { name: routine.name }),
      confirmText: t('delete.confirm'),
      cancelText: t('delete.cancel'),
      variant: 'destructive',
      onConfirm: () => deleteRoutine.mutate(routine.id),
    });

  return (
    <Item variant="outline" data-testid="routine-card">
      <ItemContent>
        <ItemTitle>
          <span data-testid="routine-card-name">{routine.name}</span>
          {routine.internetEnabled && (
            <Badge variant="outline" className="gap-1">
              <Globe className="size-3" />
              {t('card.internet')}
            </Badge>
          )}
        </ItemTitle>
        <ItemDescription>
          {t('card.schedule', { time: routine.dailyTime })}
        </ItemDescription>
        <div className="text-sm">
          <RoutineRunStatusLine routine={routine} />
        </div>
      </ItemContent>
      <ItemActions>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {routine.enabled ? t('card.enabled') : t('card.disabled')}
          </span>
          <Switch
            checked={routine.enabled}
            onCheckedChange={(enabled) =>
              updateRoutine(routine.id, { enabled })
            }
            disabled={isUpdating}
            aria-label={t('card.enabledLabel')}
            data-testid="routine-card-enabled"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => runNow.mutate(routine.id)}
          disabled={runNow.isPending || isRunActive}
          data-testid="routine-card-run-now"
        >
          <Play className="h-4 w-4" />
          {t('card.runNow')}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={t('card.edit')}
          data-testid="routine-card-edit"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={deleteRoutine.isPending}
          aria-label={t('card.delete')}
          data-testid="routine-card-delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </ItemActions>
    </Item>
  );
}
