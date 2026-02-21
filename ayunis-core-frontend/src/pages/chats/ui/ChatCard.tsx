import { Button } from '@/shared/ui/shadcn/button';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Trash2 } from 'lucide-react';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTranslation } from 'react-i18next';
import type { ChatListItem } from '../model/types';
import { useRouter } from '@tanstack/react-router';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { useDeleteChat } from '../api/useChatsSearch';

interface ChatCardProps {
  chat: ChatListItem;
}

export default function ChatCard({ chat }: Readonly<ChatCardProps>) {
  const { t } = useTranslation('chats');
  const { deleteChat, isDeleting } = useDeleteChat();
  const { confirm } = useConfirmation();
  const router = useRouter();

  const title = chat.title || t('card.untitled');
  const createdDate = new Date(chat.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    confirm({
      title: t('card.confirmDelete.title'),
      description: t('card.confirmDelete.description', { title }),
      confirmText: t('card.confirmDelete.confirmText'),
      cancelText: t('card.confirmDelete.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        deleteChat(chat.id);
      },
    });
  }

  return (
    <Item
      variant="outline"
      className="cursor-pointer"
      onClick={() =>
        void router.navigate({
          to: '/chats/$threadId',
          params: { threadId: chat.id },
        })
      }
    >
      <ItemContent>
        <ItemTitle>
          <span>{title}</span>
          {chat.isAnonymous && (
            <Badge variant="outline" className="ml-2 text-xs">
              {t('card.anonymous')}
            </Badge>
          )}
        </ItemTitle>
        <ItemDescription>{createdDate}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </ItemActions>
    </Item>
  );
}
