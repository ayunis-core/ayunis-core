import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { SubmittedByLabel } from '@/features/resource-ownership';
import type { KnowledgeBase } from '@/pages/knowledge-bases/model/openapi';
import { KnowledgeBaseListItem } from '@/shared/ui/knowledge-base-list-item';
import { KnowledgeBaseActiveSwitch } from '@/widgets/knowledge-base-activation-toggle';

export function KnowledgeBaseRow({
  knowledgeBase,
  showSubmittedBy = false,
}: Readonly<{ knowledgeBase: KnowledgeBase; showSubmittedBy?: boolean }>) {
  const { t } = useTranslation('knowledge-bases');
  const navigate = useNavigate();
  const canUse = knowledgeBase.viewer?.canUse ?? true;
  const documents = t('documentCount', { count: knowledgeBase.documentCount });

  return (
    <KnowledgeBaseListItem
      testId={`knowledge-base-card-${knowledgeBase.id}`}
      title={knowledgeBase.name}
      description={
        knowledgeBase.description
          ? `${knowledgeBase.description} · ${documents}`
          : documents
      }
      onClick={() =>
        void navigate({
          to: '/knowledge-bases/$id',
          params: { id: knowledgeBase.id },
        })
      }
      actions={
        <>
          {showSubmittedBy && (
            <SubmittedByLabel
              kind="knowledge_base"
              resource={knowledgeBase}
              testId={`knowledge-base-submitted-by-${knowledgeBase.id}`}
            />
          )}
          {canUse && (
            <KnowledgeBaseActiveSwitch
              knowledgeBaseId={knowledgeBase.id}
              isActive={knowledgeBase.isActive}
              testId={`knowledge-base-active-toggle-${knowledgeBase.id}`}
            />
          )}
        </>
      }
    />
  );
}
