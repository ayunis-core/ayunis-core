import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/widgets/empty-state';
import { PaginationWidget } from '@/widgets/pagination';
import { ChatListItem } from '@/shared/ui/chat-list-item';
import { useRoutineChats } from '@/pages/routine/api/useRoutineChats';
import { ROUTINE_ITEMS_PER_PAGE } from '@/pages/routine/model/constants';

interface RoutineChatsTabProps {
  routineId: string;
  page: number;
}

export function RoutineChatsTab({
  routineId,
  page,
}: Readonly<RoutineChatsTabProps>) {
  const { t } = useTranslation('routines');
  const { t: tChats } = useTranslation('chats');
  const { chats, total, isLoading } = useRoutineChats(routineId, page);

  if (!isLoading && chats.length === 0 && page === 1) {
    return (
      <EmptyState
        title={t('detail.chatsEmpty.title')}
        description={t('detail.chatsEmpty.description')}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3" data-testid="routine-chats-list">
        {chats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            untitledLabel={tChats('card.untitled')}
            anonymousLabel={tChats('card.anonymous')}
            actions={null}
            testId="routine-chat-item"
          />
        ))}
      </div>
      <PaginationWidget
        currentPage={page}
        totalPages={Math.ceil(total / ROUTINE_ITEMS_PER_PAGE)}
        to="/routines/$routineId"
        params={{ routineId }}
        buildSearchParams={(targetPage) => ({ tab: 'chats', page: targetPage })}
      />
    </div>
  );
}
