import { ChatHistory } from '@ayunis/chat/history';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { ListToolbar } from '@/widgets/list-toolbar';
import ChatsFilters from './ChatsFilters';
import ChatCard from './ChatCard';
import ChatsEmptyState from './ChatsEmptyState';
import ChatsPagination from './ChatsPagination';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { useTranslation } from 'react-i18next';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import type { ChatListItem } from '@/pages/chats/model/types';
import { sortFavoritesFirst, useFavorites } from '@/features/favorites';
import { Link } from '@tanstack/react-router';
import { Button } from '@ayunis/ui/components/button';
import {
  useEmbedded,
  useEmbeddedSignOut,
} from '@/shared/contexts/embedded/embeddedContext';

interface ChatsPageProps {
  chats: ChatListItem[];
  search?: string;
  hasFilters: boolean;
  pagination?: { total?: number; limit: number; offset: number };
  currentPage: number;
}

export default function ChatsPage({
  chats,
  search,
  hasFilters,
  pagination,
  currentPage,
}: Readonly<ChatsPageProps>) {
  const { t } = useTranslation('chats');
  const isEmbedded = useEmbedded();
  const signOut = useEmbeddedSignOut();
  const { favorites } = useFavorites({ enabled: !isEmbedded });
  // Sign-out ends the pane session; the pane entry then shows its sign-in.
  const embeddedAction = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        asChild
        data-testid="embedded-back-to-start"
      >
        <Link to="/chat">{t('page.embedded.backToStart')}</Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void signOut?.()}
        data-testid="embedded-sign-out"
      >
        {t('page.embedded.signOut')}
      </Button>
    </div>
  );
  const sortedChats = sortFavoritesFirst(chats, favorites, 'thread');

  const total = pagination?.total ?? 0;
  const limit = pagination?.limit ?? 20;
  const totalPages = Math.ceil(total / limit);

  if (chats.length === 0 && !hasFilters && currentPage === 1) {
    return (
      <AppLayout>
        <FullScreenMessageLayout
          header={
            <ContentAreaHeader
              breadcrumbs={[{ label: t('page.title') }]}
              action={isEmbedded ? embeddedAction : <HelpLink path="chat/" />}
            />
          }
        >
          <ChatsEmptyState hasFilters={false} />
        </FullScreenMessageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[{ label: t('page.title') }]}
            action={
              isEmbedded ? (
                embeddedAction
              ) : (
                <ListToolbar data-testid="chats-toolbar">
                  <ChatsFilters search={search} />
                  <HelpLink path="chat/" />
                </ListToolbar>
              )
            }
          />
        }
        contentArea={
          <ChatHistory
            chats={sortedChats}
            renderChat={(chat) => <ChatCard chat={chat} />}
            empty={<ChatsEmptyState hasFilters={hasFilters} />}
            pagination={
              <ChatsPagination
                currentPage={currentPage}
                totalPages={totalPages}
                search={search}
              />
            }
          />
        }
      />
    </AppLayout>
  );
}
