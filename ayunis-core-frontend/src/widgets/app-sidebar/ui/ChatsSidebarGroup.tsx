import {
  MoreHorizontal,
  MessageCircle,
  Loader2,
  Trash,
  ChevronDown,
  Search,
  Pencil,
  FolderOpen,
  Star,
  Plus,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarGroupContent,
} from '@/shared/ui/shadcn/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import {
  addProject,
  addChatToProject,
  CreateProjectDialog,
  ProjectMenuGroups,
} from '@/entities/project';
import {
  usePinnedThreadIds,
  toggleThreadPinned,
} from '@/features/usePinnedThreads';
import { cn } from '@/shared/lib/shadcn/utils';
import { useThreads } from '../api';
import { useDeleteThread } from '@/features/useDeleteThread';
import { useChatsSidebarOpen } from '@/features/useChatsSidebarOpen';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/shadcn/collapsible';
import { useTranslation } from 'react-i18next';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { RenameThreadDialog } from '@/widgets/rename-thread-dialog';

export function ChatsSidebarGroup() {
  const { t } = useTranslation('common');
  const { threads, isLoading, hasMore } = useThreads();
  const pinnedThreadIds = usePinnedThreadIds();
  const { confirm } = useConfirmation();
  const { deleteChat } = useDeleteThread({});
  const params = useParams({ strict: false });
  const navigate = useNavigate();

  const [isOpen, setOpen] = useChatsSidebarOpen();

  const [createForThread, setCreateForThread] = useState<{
    title: string;
  } | null>(null);

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

  const pinnedThreads = threads.filter((thread) =>
    pinnedThreadIds.includes(thread.id),
  );
  const otherThreads = threads.filter(
    (thread) => !pinnedThreadIds.includes(thread.id),
  );

  const renderThread = (thread: (typeof threads)[number]) => (
    <SidebarMenuItem key={thread.id} data-testid="chat">
      <SidebarMenuButton asChild isActive={params.threadId === thread.id}>
        <Link to={'/chats/$threadId'} params={{ threadId: thread.id }}>
          <MessageCircle />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate">
              {thread.title ?? t('sidebar.untitled')}
            </span>
          </div>
        </Link>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger data-testid="dropdown-menu-trigger" asChild>
          <SidebarMenuAction showOnHover>
            <MoreHorizontal />
            <span className="sr-only">{t('sidebar.more')}</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="rounded-lg"
          side="bottom"
          align="end"
          data-testid="chat-dropdown"
        >
          <DropdownMenuItem
            onClick={() => handleRenameClick(thread.id, thread.title ?? null)}
            data-testid="rename"
          >
            <Pencil />
            <span>{t('sidebar.renameChat')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggleThreadPinned(thread.id)}>
            <Star
              className={cn(
                pinnedThreadIds.includes(thread.id) && 'fill-brand text-brand',
              )}
            />
            <span>
              {pinnedThreadIds.includes(thread.id)
                ? 'Nicht mehr anheften'
                : 'Anheften'}
            </span>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderOpen />
              <span>Zu Projekt hinzufügen</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent collisionPadding={12}>
              <ProjectMenuGroups
                onSelect={(project) =>
                  addChatToProject(project.id, {
                    id: crypto.randomUUID(),
                    title: thread.title ?? t('sidebar.untitled'),
                    messages: [],
                  })
                }
              />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  const title = thread.title ?? t('sidebar.untitled');
                  setTimeout(() => setCreateForThread({ title }), 0);
                }}
              >
                <Plus />
                <span>Neues Projekt</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => handleDeleteClick(thread.id)}
            data-testid="delete"
          >
            <Trash />
            <span>{t('sidebar.deleteChat')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );

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
          <SidebarGroupLabel>Angeheftet</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{pinnedThreads.map(renderThread)}</SidebarMenu>
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
                {otherThreads.map(renderThread)}
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

      <CreateProjectDialog
        open={createForThread !== null}
        onOpenChange={(open) => {
          if (!open) setCreateForThread(null);
        }}
        onCreate={(project) => {
          addProject(project);
          if (createForThread) {
            addChatToProject(project.id, {
              id: crypto.randomUUID(),
              title: createForThread.title,
              messages: [],
            });
          }
        }}
      />

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
