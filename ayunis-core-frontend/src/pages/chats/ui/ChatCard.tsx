import { useRouter } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from '@/features/favorites';
import { useDeleteChat } from '@/features/useDeleteChat';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { ChatListItem } from '@/shared/ui/chat-list-item';
import { PinButton } from '@/shared/ui/pin-button';
import type { ChatListItem as Chat } from '@/pages/chats/model/types';

interface ChatCardProps {
  chat: Chat;
}

export default function ChatCard({ chat }: Readonly<ChatCardProps>) {
  const { t } = useTranslation('chats');
  const { deleteChat, isDeleting } = useDeleteChat();
  const { favorites } = useFavorites();
  const { toggle: toggleFavorite } = useToggleFavorite();
  const { confirm } = useConfirmation();
  const router = useRouter();
  const title = chat.title || t('card.untitled');
  const isPinned = isFavorite(favorites, chat.id, 'thread');

  function handleDelete() {
    confirm({
      title: t('card.confirmDelete.title'),
      description: t('card.confirmDelete.description', { title }),
      confirmText: t('card.confirmDelete.confirmText'),
      cancelText: t('card.confirmDelete.cancelText'),
      variant: 'destructive',
      onConfirm: () => deleteChat(chat.id),
    });
  }

  return (
    <ChatListItem
      chat={chat}
      untitledLabel={t('card.untitled')}
      anonymousLabel={t('card.anonymous')}
      onClick={() =>
        void router.navigate({
          to: '/chats/$threadId',
          params: { threadId: chat.id },
        })
      }
      actions={
        <>
          <PinButton
            isPinned={isPinned}
            pinLabel={t('card.pin')}
            unpinLabel={t('card.unpin')}
            onToggle={() => toggleFavorite('thread', chat.id)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            aria-label={t('card.confirmDelete.title')}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 />
          </Button>
        </>
      }
    />
  );
}
