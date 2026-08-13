import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Trash } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
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

interface WorkspaceChatsTabProps {
  chats: GetThreadsResponseDtoItem[];
  /** Total chats in the workspace; more than `chats` when the page is capped. */
  chatCount: number;
  onDeleteChat: (threadId: string) => void;
}

export function WorkspaceChatsTab({
  chats,
  chatCount,
  onDeleteChat,
}: Readonly<WorkspaceChatsTabProps>) {
  const { t } = useTranslation('workspace');
  const { t: tChats } = useTranslation('chats');
  const { confirm } = useConfirmation();

  if (chats.length === 0) {
    return <p className="text-muted-foreground">{t('page.emptyChats')}</p>;
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
      {chats.map((chat) => (
        <WorkspaceChatRow key={chat.id} chat={chat} onDelete={handleDelete} />
      ))}
      {chats.length < chatCount && (
        <p className="text-sm text-muted-foreground">
          {t('page.truncatedChats', { count: chats.length })}
        </p>
      )}
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
