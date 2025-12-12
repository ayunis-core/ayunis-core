import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ChatsFilters from './ChatsFilters';
import ChatCard from './ChatCard';
import ChatsEmptyState from './ChatsEmptyState';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { useTranslation } from 'react-i18next';
import type { ChatListItem, Agent } from '../model/types';

interface ChatsPageProps {
  chats: ChatListItem[];
  agents: Agent[];
  search?: string;
  agentId?: string;
  hasFilters: boolean;
}

export default function ChatsPage({
  chats,
  agents,
  search,
  agentId,
  hasFilters,
}: ChatsPageProps) {
  const { t } = useTranslation('chats');

  // Sort chats by creation date (newest first)
  const sortedChats = [...chats].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (chats.length === 0 && !hasFilters) {
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
                {sortedChats.map((chat) => (
                  <ChatCard key={chat.id} chat={chat} />
                ))}
              </div>
            )}
          </>
        }
      />
    </AppLayout>
  );
}
