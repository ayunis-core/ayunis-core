import { useTranslation } from 'react-i18next';
import { ActiveSwitch } from '@/shared/ui/active-switch/ActiveSwitch';
import { useSetKnowledgeBaseActivation } from '@/widgets/knowledge-base-activation-toggle/api/useSetKnowledgeBaseActivation';

export function KnowledgeBaseActiveSwitch({
  knowledgeBaseId,
  isActive,
  testId,
}: Readonly<{ knowledgeBaseId: string; isActive: boolean; testId?: string }>) {
  const { t } = useTranslation('knowledge-bases');
  const setActivation = useSetKnowledgeBaseActivation();

  return (
    <ActiveSwitch
      checked={isActive}
      onCheckedChange={(checked) =>
        setActivation.mutate({ id: knowledgeBaseId, isActive: checked })
      }
      label={t('activation.switchLabel')}
      tooltip={isActive ? t('activation.activeOn') : t('activation.activeOff')}
      disabled={setActivation.isPending}
      testId={testId}
    />
  );
}
