import { Loader2, ChevronDown, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroupContent,
} from '@ayunis/ui/components/sidebar';
import { useThreads } from '../api';
import { useDeleteThread } from '@/features/useDeleteThread';
import { useChatsSidebarOpen } from '@/features/useChatsSidebarOpen';
import { useIsWorkspacesEnabled } from '@/features/feature-toggles';
import { Button } from '@ayunis/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ayunis/ui/components/collapsible';
import { useTranslation } from 'react-i18next';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { RenameThreadDialog } from '@/widgets/rename-thread-dialog';
import { ChatSidebarItem } from './ChatSidebarItem';

export function ChatsSidebarGroup() {
  const { t } = useTranslation('common');
  const { threads, isLoading, hasMore } = useThreads();
  const { confirm } = useConfirmation();
  const { deleteChat } = useDeleteThread({});
  const params = useParams({ strict: false });
  const navigate = useNavigate();

  const [isOpen, setOpen] = useChatsSidebarOpen();
  const isWorkspacesEnabled = useIsWorkspacesEnabled();

  // Pinning ships with the workspaces feature; with the flag off the sidebar
  // must look exactly as it did before, even if some threads carry isPinned.
  const pinnedThreads = isWorkspacesEnabled
    ? threads.filter((thread) => thread.isPinned)
    : [];
  const otherThreads = isWorkspacesEnabled
    ? threads.filter((thread) => !thread.isPinned)
    : threads;

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [threadToRename, setThreadToRename] = useState<{
    id: string;
    title: string | null;
  } | null>(null);

  const handleRenameClick = (threadId: string, currentTitle: string | null) => {
    setThreadToRename({ id: threadId, title: currentTitle });
    // Delay to allow dropdown menu to fully close first
    setTimeout(() => setRenameDialogOpen(true), 0);
  };

  const handleDeleteClick = (threadId: string) => {
    confirm({
      title: t('sidebar.deleteChatTitle'),
      description: t('sidebar.deleteChatDescription'),
      confirmText: t('sidebar.deleteChatConfirm'),
      cancelText: t('sidebar.deleteChatCancel'),
      variant: 'destructive',
      onConfirm: () => {
        // Check if the user is currently viewing the chat being deleted
        const currentThreadId = params.threadId;
        const isCurrentChat = currentThreadId === threadId;

        deleteChat(threadId);

        // If the user is on the chat being deleted, redirect to /chat
        if (isCurrentChat) {
          void navigate({ to: '/chat' });
        }
      },
    });
  };

  if (isLoading) {
    return (
      <Collapsible
        open={isOpen}
        onOpenChange={setOpen}
        className="group/collapsible"
      >
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="flex items-center w-full">
              {t('sidebar.chats')}
              <Link
                to="/chats"
                className="ml-auto mr-1 p-1 hover:bg-accent rounded"
                onClick={(e) => e.stopPropagation()}
              >
                <Search className="size-4" />
              </Link>
              <ChevronDown className="transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton className="text-sidebar-foreground/70">
                    <Loader2 className="size-4 animate-spin" />
                    <span>{t('sidebar.loadingChats')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  }

  if (threads.length === 0) {
    return (
      <Collapsible
        open={isOpen}
        onOpenChange={setOpen}
        className="group/collapsible"
      >
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="flex items-center w-full">
              {t('sidebar.chats')}
              <Link
                to="/chats"
                className="ml-auto mr-1 p-1 hover:bg-accent rounded"
                onClick={(e) => e.stopPropagation()}
              >
                <Search className="size-4" />
              </Link>
              <ChevronDown className="transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6">
                <div className="text-center space-y-2">
                  <div className="text-sm text-foreground">
                    {t('sidebar.emptyChatsTitle')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('sidebar.emptyChatsDescription')}
                  </div>
                  <Button
                    className="mt-2"
                    onClick={() => void navigate({ to: '/chat' })}
                  >
                    {t('sidebar.newChat')}
                  </Button>
                </div>
              </div>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  }

  return (
    <>
      {pinnedThreads.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>{t('sidebar.pinnedChats')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pinnedThreads.map((thread) => (
                <ChatSidebarItem
                  key={thread.id}
                  thread={thread}
                  onRename={handleRenameClick}
                  onDelete={handleDeleteClick}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      <Collapsible
        open={isOpen}
        onOpenChange={setOpen}
        className="group/collapsible"
      >
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              {t('sidebar.chats')}
              <Link
                to="/chats"
                className="text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <Search className="size-4" />
              </Link>
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {otherThreads.map((thread) => (
                  <ChatSidebarItem
                    key={thread.id}
                    thread={thread}
                    onRename={handleRenameClick}
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
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>

      {threadToRename && (
        <RenameThreadDialog
          open={renameDialogOpen}
          onOpenChange={(open) => {
            setRenameDialogOpen(open);
            if (!open) {
              setThreadToRename(null);
            }
          }}
          threadId={threadToRename.id}
          currentTitle={threadToRename.title}
        />
      )}
    </>
  );
}
