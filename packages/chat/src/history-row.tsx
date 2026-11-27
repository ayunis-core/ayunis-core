import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen } from 'lucide-react';
import type { GetThreadsResponseDtoItem } from '@ayunis/api-client/schemas';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import type {
  ChatFavorites,
  ChatViewConfig,
  ChatWorkspaces,
} from './chat-config';
import { PinButton } from './conversation-header-controls';
import { ChatHistoryEntry } from './history/ChatHistoryEntry';
import { ChatHistoryDeleteAction } from './history/ThreadDialogs';
import { WorkspacePickerMenuWithCreate } from './workspaces/WorkspacePickerMenuWithCreate';
import { useMenuDialogTransition } from './workspaces/use-menu-dialog-transition';

interface HistoryRowProps {
  readonly chat: GetThreadsResponseDtoItem;
  readonly config: ChatViewConfig;
  readonly deleting: boolean;
  readonly onSelect: (threadId: string) => void;
  readonly onDelete: (threadId: string) => void;
}

/** A plain click opens the chat in place; a modified one is left to the browser. */
function opensInPlace(event: MouseEvent, href: string | undefined): boolean {
  if (!href) return true;
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function HistoryRow({
  chat,
  config,
  deleting,
  onSelect,
  onDelete,
}: HistoryRowProps) {
  const { t } = useTranslation('chats');
  const href = config.events.hrefFor?.({ kind: 'thread', threadId: chat.id });
  return (
    <ChatHistoryEntry
      chat={chat}
      testId="chat-card"
      untitledLabel={t('card.untitled')}
      anonymousLabel={t('card.anonymous')}
      renderTitle={(title, className) => (
        <a
          href={href ?? `#chat-${chat.id}`}
          className={className}
          onClick={(event) => {
            if (!opensInPlace(event, href)) return;
            event.preventDefault();
            onSelect(chat.id);
          }}
        >
          {title}
        </a>
      )}
      actions={
        <>
          {config.favorites && (
            <HistoryPinButton favorites={config.favorites} threadId={chat.id} />
          )}
          {config.workspaces && (
            <HistoryWorkspaceButton
              workspaces={config.workspaces}
              chat={chat}
            />
          )}
          <ChatHistoryDeleteAction
            title={chat.title || t('card.untitled')}
            busy={deleting}
            onDelete={() => onDelete(chat.id)}
          />
        </>
      }
    />
  );
}

function HistoryPinButton({
  favorites,
  threadId,
}: Readonly<{ favorites: ChatFavorites; threadId: string }>) {
  const { t } = useTranslation('chats');
  const isPinned = favorites.isFavorite(threadId);
  return (
    <PinButton
      isPinned={isPinned}
      label={isPinned ? t('card.unpin') : t('card.pin')}
      onToggle={() => favorites.toggle(threadId)}
    />
  );
}

function HistoryWorkspaceButton({
  workspaces,
  chat,
}: Readonly<{ workspaces: ChatWorkspaces; chat: GetThreadsResponseDtoItem }>) {
  const { t } = useTranslation('common');
  const transition = useMenuDialogTransition();
  const label = t('sidebar.addToWorkspace');
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={label}
              data-testid="chat-workspace-menu-trigger"
            >
              <FolderOpen />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={transition.handleCloseAutoFocus}
      >
        <WorkspacePickerMenuWithCreate
          workspaces={workspaces.items}
          selectedWorkspaceId={chat.workspaceId}
          onClear={() => workspaces.moveThread(chat.id, null)}
          onSelect={(workspace) => workspaces.moveThread(chat.id, workspace.id)}
          onCreateNew={() =>
            transition.requestDialogOpen(() => workspaces.create(chat.id))
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
