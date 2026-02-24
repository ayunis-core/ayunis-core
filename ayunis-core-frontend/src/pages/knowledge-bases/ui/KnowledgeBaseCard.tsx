import { Button } from '@/shared/ui/shadcn/button';
import { Trash2 } from 'lucide-react';
import { useDeleteKnowledgeBase } from '../api/useDeleteKnowledgeBase';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTranslation } from 'react-i18next';
import type { KnowledgeBase } from '../model/openapi';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';

interface KnowledgeBaseCardProps {
  knowledgeBase: KnowledgeBase;
}

export default function KnowledgeBaseCard({
  knowledgeBase,
}: Readonly<KnowledgeBaseCardProps>) {
  const { t } = useTranslation('knowledge-bases');
  const deleteKnowledgeBase = useDeleteKnowledgeBase();
  const { confirm } = useConfirmation();

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

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>
          <span>{knowledgeBase.name}</span>
        </ItemTitle>
        {knowledgeBase.description && (
          <ItemDescription>{knowledgeBase.description}</ItemDescription>
        )}
      </ItemContent>
      <ItemActions>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={deleteKnowledgeBase.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </ItemActions>
    </Item>
  );
}
