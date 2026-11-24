import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Star,
  Trash,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ayunis/ui/components/sidebar';
import { cn } from '@ayunis/ui/lib/cn';
import {
  ChatWorkspaceSubmenu,
  CreateChatWorkspaceDialog,
} from '@/widgets/chat-workspace-menu';
import { useOnboardingTour, type TourTargetName } from '@/widgets/onboarding';
import { useToggleFavorite } from '@/features/favorites';
import type { GetThreadsResponseDtoItem } from '@ayunis/api-client/schemas';
import { useDropdownDialogTransition } from '@/shared/hooks/useDropdownDialogTransition';

interface ChatSidebarItemProps {
  thread: GetThreadsResponseDtoItem;
  isPinned: boolean;
  isRunning?: boolean;
  onRename: (threadId: string, currentTitle: string | null) => void;
  onDelete: (threadId: string) => void;
  tourTarget?: TourTargetName;
}

function ChatIcon({
  isRunning,
  isRoutine,
}: Readonly<{ isRunning: boolean; isRoutine: boolean }>) {
  const { t } = useTranslation('common');
  if (isRunning) {
    return (
      <Loader2
        className="animate-spin"
        data-testid="chat-running-indicator"
        aria-label={t('sidebar.chatRunning')}
      />
    );
  }
  return isRoutine ? (
    <CalendarClock data-testid="chat-routine-icon" />
  ) : (
    <MessageCircle />
  );
}

export function ChatSidebarItem({
  thread,
  isPinned,
  isRunning = false,
  onRename,
  onDelete,
  tourTarget,
}: Readonly<ChatSidebarItemProps>) {
  const { t } = useTranslation('common');
  const params = useParams({ strict: false });
  const { toggle: togglePinned } = useToggleFavorite();
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const { requestDialogOpen, handleCloseAutoFocus } =
    useDropdownDialogTransition();
  const { activeTarget } = useOnboardingTour();
  const isTourHighlighted =
    tourTarget !== undefined && activeTarget === tourTarget;

  return (
    <>
      <SidebarMenuItem data-testid="chat">
        <SidebarMenuButton asChild isActive={params.threadId === thread.id}>
          <Link to="/chats/$threadId" params={{ threadId: thread.id }}>
            <ChatIcon
              isRunning={isRunning}
              isRoutine={thread.origin.kind === 'routine'}
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate">
                {thread.title ?? t('sidebar.untitled')}
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="dropdown-menu-trigger" asChild>
            <SidebarMenuAction
              showOnHover={!isTourHighlighted}
              data-tour={tourTarget}
            >
              <MoreHorizontal />
              <span className="sr-only">{t('sidebar.more')}</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="rounded-lg"
            side="bottom"
            align="end"
            collisionPadding={8}
            data-testid="chat-dropdown"
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            <DropdownMenuItem
              onClick={() =>
                requestDialogOpen(() =>
                  onRename(thread.id, thread.title ?? null),
                )
              }
              data-testid="rename"
            >
              <Pencil />
              <span>{t('sidebar.renameChat')}</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => togglePinned('thread', thread.id)}>
              <Star className={cn(isPinned && 'fill-brand text-brand')} />
              <span>
                {isPinned ? t('sidebar.unpinChat') : t('sidebar.pinChat')}
              </span>
            </DropdownMenuItem>
            <ChatWorkspaceSubmenu
              threadId={thread.id}
              workspaceId={thread.workspaceId}
              onCreateNew={() =>
                requestDialogOpen(() => setIsCreateWorkspaceOpen(true))
              }
            />

            <DropdownMenuItem
              variant="destructive"
              onClick={() => requestDialogOpen(() => onDelete(thread.id))}
              data-testid="delete"
            >
              <Trash />
              <span>{t('sidebar.deleteChat')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <CreateChatWorkspaceDialog
        threadId={thread.id}
        open={isCreateWorkspaceOpen}
        onOpenChange={setIsCreateWorkspaceOpen}
      />
    </>
  );
}
