import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from '@/features/favorites';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { SearchPagination } from '@/widgets/pagination';
import { ChatListItem } from '@/shared/ui/chat-list-item';
import { PinButton } from '@/shared/ui/pin-button';
import type { GetThreadsResponseDtoItem } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface WorkspaceChatsTabProps {
  chats: GetThreadsResponseDtoItem[];
  workspaceId: string;
  chatSearch?: string;
  chatPage: number;
  chatPagination: { total?: number; limit: number; offset: number };
  onDeleteChat: (threadId: string) => void;
}

export function WorkspaceChatsTab({
  chats,
  workspaceId,
  chatSearch,
  chatPage,
  chatPagination,
  onDeleteChat,
}: Readonly<WorkspaceChatsTabProps>) {
  const { t } = useTranslation('workspace');
  const { t: tChats } = useTranslation('chats');
  const { confirm } = useConfirmation();
  const totalPages = Math.ceil(
    (chatPagination.total ?? 0) / chatPagination.limit,
  );

  if (chats.length === 0 && !chatSearch && chatPage === 1) {
    return (
      <Empty data-testid="workspace-chats-empty">
        <EmptyMedia variant="icon">
          <MessageSquare />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{t('page.emptyChatsTitle')}</EmptyTitle>
          <EmptyDescription>{t('page.emptyChats')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  function handleDelete(chat: GetThreadsResponseDtoItem) {
    const title = chat.title ?? t('chat.untitled');
    confirm({
      title: tChats('card.confirmDelete.title'),
      description: tChats('card.confirmDelete.description', { title }),
      confirmText: tChats('card.confirmDelete.confirmText'),
      cancelText: tChats('card.confirmDelete.cancelText'),
      variant: 'destructive',
      onConfirm: () => onDeleteChat(chat.id),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {chats.length === 0 ? (
        <p className="text-muted-foreground">{t('page.noChatResults')}</p>
      ) : null}
      {chats.map((chat) => (
        <WorkspaceChatRow key={chat.id} chat={chat} onDelete={handleDelete} />
      ))}
      <SearchPagination
        currentPage={chatPage}
        totalPages={totalPages}
        to="/workspaces/$workspaceId"
        params={{ workspaceId }}
        search={chatSearch}
      />
    </div>
  );
}

interface WorkspaceChatRowProps {
  chat: GetThreadsResponseDtoItem;
  onDelete: (chat: GetThreadsResponseDtoItem) => void;
}

function WorkspaceChatRow({ chat, onDelete }: Readonly<WorkspaceChatRowProps>) {
  const { t } = useTranslation('workspace');
  const { t: tChats } = useTranslation('chats');
  const { favorites } = useFavorites();
  const { toggle: toggleFavorite } = useToggleFavorite();
  const router = useRouter();
  const isPinned = isFavorite(favorites, chat.id, 'thread');

  return (
    <ChatListItem
      chat={chat}
      testId={`workspace-chat-${chat.id}`}
      untitledLabel={t('chat.untitled')}
      anonymousLabel={tChats('card.anonymous')}
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
            pinLabel={tChats('card.pin')}
            unpinLabel={tChats('card.unpin')}
            onToggle={() => toggleFavorite('thread', chat.id)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            aria-label={tChats('card.confirmDelete.title')}
            onClick={() => onDelete(chat)}
          >
            <Trash2 />
          </Button>
        </>
      }
    />
  );
}
