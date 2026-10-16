import { Button } from '@ayunis/ui/components/button';
import { Trash2 } from 'lucide-react';
import { useDeleteKnowledgeBase } from '@/pages/knowledge-bases/api/useDeleteKnowledgeBase';
import { OwnerBadge, SubmittedByLabel } from '@/features/resource-ownership';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTranslation } from 'react-i18next';
import type { KnowledgeBase } from '@/pages/knowledge-bases/model/openapi';
import { useRouter } from '@tanstack/react-router';
import { KnowledgeBaseActivationToggle } from '@/widgets/knowledge-base-activation-toggle';
import { KnowledgeBaseListItem } from '@/shared/ui/knowledge-base-list-item';

interface KnowledgeBaseCardProps {
  knowledgeBase: KnowledgeBase;
}

export default function KnowledgeBaseCard({
  knowledgeBase,
}: Readonly<KnowledgeBaseCardProps>) {
  const { t } = useTranslation('knowledge-bases');
  const deleteKnowledgeBase = useDeleteKnowledgeBase();
  const { confirm } = useConfirmation();
  const router = useRouter();

  function handleDelete() {
    confirm({
      title: t('card.confirmDelete.title'),
      description: t('card.confirmDelete.description', {
        title: knowledgeBase.name,
      }),
      confirmText: t('card.confirmDelete.confirmText'),
      cancelText: t('card.confirmDelete.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        deleteKnowledgeBase.mutate({ id: knowledgeBase.id });
      },
    });
  }

  const canUse = knowledgeBase.viewer?.canUse ?? true;
  const canDelete = knowledgeBase.viewer?.canDelete ?? false;

  return (
    <KnowledgeBaseListItem
      testId={`knowledge-base-card-${knowledgeBase.id}`}
      title={
        <>
          <span>{knowledgeBase.name}</span>
          <OwnerBadge
            resource={knowledgeBase}
            testId={`knowledge-base-owner-${knowledgeBase.id}`}
          />
          <SubmittedByLabel
            kind="knowledge_base"
            resource={knowledgeBase}
            testId={`knowledge-base-submitted-by-${knowledgeBase.id}`}
          />
        </>
      }
      description={knowledgeBase.description}
      onClick={() =>
        void router.navigate({
          to: '/knowledge-bases/$id',
          params: { id: knowledgeBase.id },
        })
      }
      actions={
        <>
          {canUse && (
            <KnowledgeBaseActivationToggle
              knowledgeBaseId={knowledgeBase.id}
              isActive={knowledgeBase.isActive}
              testId={`knowledge-base-active-toggle-${knowledgeBase.id}`}
            />
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleteKnowledgeBase.isPending}
            >
              <Trash2 />
            </Button>
          )}
        </>
      }
    />
  );
}
