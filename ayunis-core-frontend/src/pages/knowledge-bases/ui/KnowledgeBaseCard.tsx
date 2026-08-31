import { Button } from '@ayunis/ui/components/button';
import { Badge } from '@ayunis/ui/components/badge';
import { Trash2 } from 'lucide-react';
import { useDeleteKnowledgeBase } from '@/pages/knowledge-bases/api/useDeleteKnowledgeBase';
import { PermissionGate } from '@/features/permissions';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTranslation } from 'react-i18next';
import type { KnowledgeBase } from '@/pages/knowledge-bases/model/openapi';
import { useRouter } from '@tanstack/react-router';
import { KnowledgeBaseActivationToggle } from '@/widgets/knowledge-base-activation-toggle';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';

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

  const isShared = knowledgeBase.isShared;

  return (
    <Item
      variant="outline"
      className="cursor-pointer"
      data-testid={`knowledge-base-card-${knowledgeBase.id}`}
      onClick={() =>
        void router.navigate({
          to: '/knowledge-bases/$id',
          params: { id: knowledgeBase.id },
        })
      }
    >
      <ItemContent>
        <ItemTitle>
          <span>{knowledgeBase.name}</span>
          {isShared && (
            <Badge
              variant="secondary"
              className="ml-2 text-xs"
              data-testid={`knowledge-base-shared-badge-${knowledgeBase.id}`}
            >
              {t('shared.badge')}
            </Badge>
          )}
        </ItemTitle>
        {knowledgeBase.description && (
          <ItemDescription>{knowledgeBase.description}</ItemDescription>
        )}
      </ItemContent>
      <ItemActions>
        <KnowledgeBaseActivationToggle
          knowledgeBaseId={knowledgeBase.id}
          isActive={knowledgeBase.isActive}
          testId={`knowledge-base-active-toggle-${knowledgeBase.id}`}
        />
        {!isShared && (
          <PermissionGate permission="manage_knowledge_bases">
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={(event) => {
                event.stopPropagation();
                handleDelete();
              }}
              disabled={deleteKnowledgeBase.isPending}
            >
              <Trash2 />
            </Button>
          </PermissionGate>
        )}
      </ItemActions>
    </Item>
  );
}
