import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ayunis/ui/components/sidebar';
import { useThreads } from '@/widgets/app-sidebar/api';
import { useDeleteThread } from '@/features/thread-run';
import { useFavorites } from '@/features/favorites';
import { Button } from '@ayunis/ui/components/button';
import { useTranslation } from 'react-i18next';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { RenameThreadDialog } from '@/widgets/rename-thread-dialog';
import { ChatSidebarItem } from './ChatSidebarItem';
import { SidebarCollapsibleGroup } from './SidebarCollapsibleGroup';

function ChatsSearchLink() {
  return (
    <Link
      to="/chats"
      className="text-muted-foreground"
      onClick={(e) => e.stopPropagation()}
    >
      <Search className="size-4" />
    </Link>
  );
}

function LoadingChats() {
  const { t } = useTranslation('common');
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton className="text-sidebar-foreground/70">
          <Loader2 className="size-4 animate-spin" />
          <span>{t('sidebar.loadingChats')}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function EmptyChats() {
  const { t } = useTranslation('common');
  return (
    <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6">
      <div className="text-center space-y-2">
        <div className="text-sm text-foreground">
          {t('sidebar.emptyChatsTitle')}
        </div>
        <div className="text-xs text-muted-foreground">
          {t('sidebar.emptyChatsDescription')}
        </div>
        <Button asChild className="mt-2">
          <Link to="/chat">{t('sidebar.newChat')}</Link>
        </Button>
      </div>
    </div>
  );
}

export function ChatsSidebarGroup() {
  const { t } = useTranslation('common');
  const { threads, isLoading, hasMore } = useThreads();
  const { confirm } = useConfirmation();
  const { deleteChat } = useDeleteThread({});
  const params = useParams({ strict: false });
  const navigate = useNavigate();

  const { favorites, isLoading: areFavoritesLoading } = useFavorites();
  const pinnedThreadIds = new Set(
    favorites
      .filter((item) => item.referenceType === 'thread')
      .map((item) => item.referenceId),
  );
  const otherThreads = threads.filter(
    (thread) => !pinnedThreadIds.has(thread.id),
  );

  const [threadToRename, setThreadToRename] = useState<{
    id: string;
    title: string | null;
  } | null>(null);

  const handleDeleteClick = (threadId: string) => {
    confirm({
      title: t('sidebar.deleteChatTitle'),
      description: t('sidebar.deleteChatDescription'),
      confirmText: t('sidebar.deleteChatConfirm'),
      cancelText: t('sidebar.deleteChatCancel'),
      variant: 'destructive',
      onConfirm: () => {
        const isCurrentChat = params.threadId === threadId;
        deleteChat(threadId);
        if (isCurrentChat) {
          void navigate({ to: '/chat' });
        }
      },
    });
  };

  return (
    <>
      <SidebarCollapsibleGroup
        label={t('sidebar.chats')}
        storageKey="sidebar_chats_open"
        action={<ChatsSearchLink />}
        testId="sidebar-chats"
      >
        {isLoading || areFavoritesLoading ? <LoadingChats /> : null}
        {!isLoading && !areFavoritesLoading && threads.length === 0 ? (
          <EmptyChats />
        ) : null}
        {!isLoading && !areFavoritesLoading && threads.length > 0 ? (
          <SidebarMenu>
            {otherThreads.map((thread) => (
              <ChatSidebarItem
                key={thread.id}
                thread={thread}
                isPinned={pinnedThreadIds.has(thread.id)}
                onRename={(threadId, title) =>
                  setThreadToRename({ id: threadId, title })
                }
                onDelete={handleDeleteClick}
              />
            ))}
            {hasMore && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/chats" className="text-muted-foreground">
                    <span>{t('sidebar.showMore')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        ) : null}
      </SidebarCollapsibleGroup>

      {threadToRename && (
        <RenameThreadDialog
          open
          onOpenChange={(open) => {
            if (!open) setThreadToRename(null);
          }}
          threadId={threadToRename.id}
          currentTitle={threadToRename.title}
        />
      )}
    </>
  );
}
