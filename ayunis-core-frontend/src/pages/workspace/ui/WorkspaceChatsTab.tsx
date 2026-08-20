import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Trash } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { useConfirmation } from '@/widgets/confirmation-modal';
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from '@/features/favorites';
import { PinButton } from '@/shared/ui/pin-button';
import type { GetThreadsResponseDtoItem } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { SearchPagination } from '@/widgets/pagination';

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
    <div className="flex flex-col gap-2">
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
  const { toggle: togglePinned } = useToggleFavorite();
  const isPinned = isFavorite(favorites, chat.id, 'thread');

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>
          <Link to="/chats/$threadId" params={{ threadId: chat.id }}>
            {chat.title ?? t('chat.untitled')}
          </Link>
        </ItemTitle>
      </ItemContent>
      <ItemActions>
        <PinButton
          isPinned={isPinned}
          pinLabel={t('chat.pin')}
          unpinLabel={t('chat.unpin')}
          onToggle={() => togglePinned('thread', chat.id)}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label={tChats('card.confirmDelete.title')}
          onClick={() => onDelete(chat)}
        >
          <Trash className="text-destructive" />
        </Button>
      </ItemActions>
    </Item>
  );
}
