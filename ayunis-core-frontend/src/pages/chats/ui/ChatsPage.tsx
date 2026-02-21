import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ChatsFilters from './ChatsFilters';
import ChatCard from './ChatCard';
import ChatsEmptyState from './ChatsEmptyState';
import ChatsPagination from './ChatsPagination';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { useTranslation } from 'react-i18next';
import type { ChatListItem, Agent } from '../model/types';

interface ChatsPageProps {
  chats: ChatListItem[];
  agents: Agent[];
  search?: string;
  agentId?: string;
  hasFilters: boolean;
  pagination?: { total?: number; limit: number; offset: number };
  currentPage: number;
}

export default function ChatsPage({
  chats,
  agents,
  search,
  agentId,
  hasFilters,
  pagination,
  currentPage,
}: Readonly<ChatsPageProps>) {
  const { t } = useTranslation('chats');

  const total = pagination?.total ?? 0;
  const limit = pagination?.limit ?? 20;
  const totalPages = Math.ceil(total / limit);

  if (chats.length === 0 && !hasFilters && currentPage === 1) {
    return (
      <AppLayout>
        <FullScreenMessageLayout
          header={<ContentAreaHeader title={t('page.title')} />}
        >
          <ChatsEmptyState hasFilters={false} />
        </FullScreenMessageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={<ContentAreaHeader title={t('page.title')} />}
        contentArea={
          <>
            <ChatsFilters agents={agents} search={search} agentId={agentId} />
            {chats.length === 0 ? (
              <ChatsEmptyState hasFilters={hasFilters} />
            ) : (
              <div className="space-y-3">
                {chats.map((chat) => (
                  <ChatCard key={chat.id} chat={chat} />
                ))}
              </div>
            )}
            <ChatsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              search={search}
              agentId={agentId}
            />
          </>
        }
      />
    </AppLayout>
  );
}
