import { Switch } from '@ayunis/ui/components/switch';
import { useTranslation } from 'react-i18next';
import { useSetKnowledgeBaseActivation } from '@/widgets/knowledge-base-activation-toggle/api/useSetKnowledgeBaseActivation';

interface KnowledgeBaseActivationToggleProps {
  knowledgeBaseId: string;
  isActive: boolean;
  testId: string;
}

export function KnowledgeBaseActivationToggle({
  knowledgeBaseId,
  isActive,
  testId,
}: Readonly<KnowledgeBaseActivationToggleProps>) {
  const { t } = useTranslation('knowledge-bases');
  const setActivation = useSetKnowledgeBaseActivation();
  const statusLabel = isActive
    ? t('activation.activeLabel')
    : t('activation.inactiveLabel');

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{statusLabel}</span>
      <Switch
        checked={isActive}
        onCheckedChange={(nextIsActive) =>
          setActivation.mutate({ id: knowledgeBaseId, isActive: nextIsActive })
        }
        onClick={(event) => event.stopPropagation()}
        disabled={setActivation.isPending}
        aria-label={statusLabel}
        data-testid={testId}
      />
    </div>
  );
}
