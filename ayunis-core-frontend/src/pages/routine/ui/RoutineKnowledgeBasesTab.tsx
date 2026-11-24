import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import { Switch } from '@ayunis/ui/components/switch';
import {
  useRoutineKnowledgeBases,
  useToggleRoutineKnowledgeBase,
} from '@/pages/routine/api/useRoutineKnowledgeBases';
import { routineKnowledgeBaseRows } from '@/pages/routine/lib/routine-knowledge-base-rows';
import { RoutineContextList } from './RoutineContextList';

export function RoutineKnowledgeBasesTab({
  routineId,
}: Readonly<{ routineId: string }>) {
  const { t } = useTranslation('routines');
  const data = useRoutineKnowledgeBases(routineId);
  const toggle = useToggleRoutineKnowledgeBase(
    routineId,
    data.availableKnowledgeBases,
  );
  const assignedIds = data.assignedIds ?? [];
  const knowledgeBases = routineKnowledgeBaseRows(
    data.availableKnowledgeBases,
    data.assignedKnowledgeBases,
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t('detail.context.knowledgeBasesDescription')}
      </p>
      <RoutineContextList
        isLoading={data.isLoading}
        isError={data.isError}
        onRetry={data.refetch}
        emptyText={t('detail.context.knowledgeBasesEmpty')}
        rows={knowledgeBases.map((knowledgeBase) => ({
          id: knowledgeBase.id,
          title: (
            <>
              {knowledgeBase.name}
              {knowledgeBase.isShared && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {t('detail.context.sharedBadge')}
                </Badge>
              )}
            </>
          ),
          description: knowledgeBase.description,
          control: (
            <Switch
              checked={assignedIds.includes(knowledgeBase.id)}
              onCheckedChange={(on) =>
                toggle.mutate({ knowledgeBaseId: knowledgeBase.id, on })
              }
              disabled={toggle.isPending}
              aria-label={t('detail.context.toggleAriaLabel', {
                name: knowledgeBase.name,
              })}
              data-testid={`routine-knowledge-base-${knowledgeBase.id}`}
            />
          ),
        }))}
      />
    </div>
  );
}
