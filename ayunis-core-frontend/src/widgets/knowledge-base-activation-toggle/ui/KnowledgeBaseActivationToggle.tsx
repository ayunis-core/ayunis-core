import { Switch } from '@ayunis/ui/components/switch';
import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { useSetKnowledgeBaseActivation } from '@/widgets/knowledge-base-activation-toggle/api/useSetKnowledgeBaseActivation';

interface KnowledgeBaseActivationToggleProps {
  knowledgeBaseId: string;
  isActive: boolean;
  testId: string;
  onToggle?: (isActive: boolean) => void;
  isPending?: boolean;
  tooltip?: string;
}

export function KnowledgeBaseActivationToggle({
  knowledgeBaseId,
  isActive,
  testId,
  onToggle,
  isPending = false,
  tooltip,
}: Readonly<KnowledgeBaseActivationToggleProps>) {
  const { t } = useTranslation('knowledge-bases');
  const setActivation = useSetKnowledgeBaseActivation();
  const statusLabel = isActive
    ? t('activation.activeLabel')
    : t('activation.inactiveLabel');

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{statusLabel}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Switch
              checked={isActive}
              onCheckedChange={(nextIsActive) => {
                if (onToggle) {
                  onToggle(nextIsActive);
                } else {
                  setActivation.mutate({
                    id: knowledgeBaseId,
                    isActive: nextIsActive,
                  });
                }
              }}
              onClick={(event) => event.stopPropagation()}
              disabled={isPending || setActivation.isPending}
              aria-label={statusLabel}
              data-testid={testId}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {tooltip ?? t('activation.tooltip')}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
