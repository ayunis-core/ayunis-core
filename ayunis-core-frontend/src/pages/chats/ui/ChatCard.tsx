import { useTranslation } from 'react-i18next';
import { ChatHistoryDeleteAction } from '@ayunis/chat/history';
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from '@/features/favorites';
import { useDeleteChat } from '@/features/useDeleteChat';
import { ChatWorkspaceMenuButton } from '@/widgets/chat-workspace-menu';
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
  const title = chat.title || t('card.untitled');
  const isPinned = isFavorite(favorites, chat.id, 'thread');

  return (
    <ChatListItem
      chat={chat}
      testId="chat-card"
      untitledLabel={t('card.untitled')}
      anonymousLabel={t('card.anonymous')}
      actions={
        <>
          <PinButton
            isPinned={isPinned}
            pinLabel={t('card.pin')}
            unpinLabel={t('card.unpin')}
            onToggle={() => toggleFavorite('thread', chat.id)}
          />
          <ChatWorkspaceMenuButton
            threadId={chat.id}
            workspaceId={chat.workspaceId}
          />
          <ChatHistoryDeleteAction
            title={title}
            busy={isDeleting}
            onDelete={() => deleteChat(chat.id)}
          />
        </>
      }
    />
  );
}
