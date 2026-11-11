import { Button } from '@ayunis/ui/components/button';
import { Trash2 } from 'lucide-react';
import { useDeleteKnowledgeBase } from '@/pages/knowledge-bases/api/useDeleteKnowledgeBase';
import { PermissionGate } from '@/features/permissions';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTranslation } from 'react-i18next';
import type { KnowledgeBase } from '@/pages/knowledge-bases/model/openapi';
import { useRouter } from '@tanstack/react-router';
import { KnowledgeBaseActivationToggle } from '@/widgets/knowledge-base-activation-toggle';
import { KnowledgeBaseListItem } from '@/shared/ui/knowledge-base-list-item';
import { useResourceOwnership } from '@/features/resource-ownership';

interface KnowledgeBaseCardProps {
  knowledgeBase: KnowledgeBase;
}

export default function KnowledgeBaseCard({
  knowledgeBase,
}: Readonly<KnowledgeBaseCardProps>) {
  const { t } = useTranslation('knowledge-bases');
  const { t: tOwnership } = useTranslation('ownership');
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

  const { canManage } = useResourceOwnership('knowledge-base');
  const isCollective =
    knowledgeBase.ownerType === 'team' || knowledgeBase.ownerType === 'org';

  return (
    <KnowledgeBaseListItem
      testId={`knowledge-base-card-${knowledgeBase.id}`}
      title={knowledgeBase.name}
      description={knowledgeBase.description}
      onClick={() =>
        void router.navigate({
          to: '/knowledge-bases/$id',
          params: { id: knowledgeBase.id },
        })
      }
      actions={
        <>
          <KnowledgeBaseActivationToggle
            knowledgeBaseId={knowledgeBase.id}
            isActive={knowledgeBase.isActive}
            testId={`knowledge-base-active-toggle-${knowledgeBase.id}`}
            disabled={isCollective && !canManage(knowledgeBase)}
            tooltip={
              isCollective ? tOwnership('activation.managedByOwner') : undefined
            }
          />
          {(!isCollective || canManage(knowledgeBase)) && (
            <PermissionGate permission="manage_knowledge_bases">
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={deleteKnowledgeBase.isPending}
              >
                <Trash2 />
              </Button>
            </PermissionGate>
          )}
        </>
      }
    />
  );
}
