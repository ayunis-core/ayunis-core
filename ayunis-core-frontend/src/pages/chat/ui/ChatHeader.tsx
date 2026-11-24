import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import {
  Inbox,
  Megaphone,
  MoreVertical,
  PanelRight,
  Pencil,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from '@/features/favorites';
import { useWorkspaces } from '@/features/workspaces';
import { useIsFeatureEnabled } from '@/features/feature-toggles';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import {
  ChatWorkspaceSubmenu,
  CreateChatWorkspaceDialog,
} from '@/widgets/chat-workspace-menu';
import { useDropdownDialogTransition } from '@/shared/hooks/useDropdownDialogTransition';
import { Button } from '@ayunis/ui/components/button';
import { PinButton } from '@/shared/ui/pin-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';

interface ChatHeaderProps {
  readonly threadId: string;
  readonly threadTitle?: string;
  readonly isAnonymous: boolean;
  readonly workspaceId?: string | null;
  readonly origin?: GetThreadResponseDto['origin'];
  readonly actions?: ReactNode;
  readonly onRename?: () => void;
  readonly onDelete?: () => void;
}

export default function ChatHeader({
  threadId,
  threadTitle,
  isAnonymous,
  workspaceId,
  origin,
  actions,
  onRename,
  onDelete,
}: Readonly<ChatHeaderProps>) {
  const { t } = useTranslation('chat');
  const { t: tCommon } = useTranslation('common');
  const { t: tWorkspace } = useTranslation('workspace');
  const { favorites } = useFavorites();
  const { toggle: togglePinned } = useToggleFavorite();
  const { workspaces } = useWorkspaces();
  const isPinned = isFavorite(favorites, threadId, 'thread');

  const displayTitle = threadTitle || t('chat.untitled');
  const workspace = workspaceId
    ? workspaces.find((w) => w.id === workspaceId)
    : undefined;
  const breadcrumbs = workspace
    ? [
        { label: tWorkspace('page.breadcrumb'), href: '/workspaces' },
        { label: workspace.name, href: `/workspaces/${workspace.id}` },
        {
          label: t('chat.chats'),
          href: `/workspaces/${workspace.id}`,
          search: { tab: 'chats' },
        },
        { label: displayTitle },
      ]
    : [{ label: t('chat.chats'), href: '/chats' }, { label: displayTitle }];

  const anonymousBadge = isAnonymous ? <AnonymousBadge /> : undefined;

  return (
    <ContentAreaHeader
      breadcrumbs={breadcrumbs}
      badge={
        <>
          {anonymousBadge}
          <ChatSourceBadge origin={origin} />
        </>
      }
      action={
        <div className="flex items-center gap-1">
          <PinButton
            isPinned={isPinned}
            pinLabel={tCommon('sidebar.pinChat')}
            unpinLabel={tCommon('sidebar.unpinChat')}
            onToggle={() => togglePinned('thread', threadId)}
          />
          <ThreadActionsMenu
            onRename={onRename}
            onDelete={onDelete}
            workspace={{ threadId, workspaceId }}
          />
          {actions}
        </div>
      }
    />
  );
}

export function ChatArtifactPanelButton({
  open,
  onToggle,
}: Readonly<{
  open: boolean;
  onToggle: () => void;
}>) {
  const { t } = useTranslation('chat');

  return (
    <Button
      variant={open ? 'secondary' : 'ghost'}
      size="icon"
      data-testid="chat-side-panel-toggle"
      onClick={onToggle}
      aria-label={t('chat.sidePanel.open')}
      aria-pressed={open}
    >
      <PanelRight className="h-5 w-5 text-primary" />
    </Button>
  );
}

function AnonymousBadge() {
  const { t } = useTranslation('chat');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary">
          <ShieldCheck className="h-3 w-3" />
          {t('chat.anonymousMode')}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{t('chat.anonymousModeTooltip')}</TooltipContent>
    </Tooltip>
  );
}

type ThreadActionsMenuProps = Pick<ChatHeaderProps, 'onRename' | 'onDelete'> & {
  /** Omitted in the Outlook pane, which has no workspaces. */
  readonly workspace?: {
    readonly threadId: string;
    readonly workspaceId?: string | null;
  };
};

function ThreadActionsMenu({
  onRename,
  onDelete,
  workspace,
}: ThreadActionsMenuProps) {
  const { t } = useTranslation('chat');
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const { requestDialogOpen, handleCloseAutoFocus } =
    useDropdownDialogTransition();

  if (!onRename && !onDelete && !workspace) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5 text-primary" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={handleCloseAutoFocus}
        >
          {onRename && (
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="h-4 w-4" />
              <span>{t('chat.renameThread')}</span>
            </DropdownMenuItem>
          )}
          {workspace && (
            <ChatWorkspaceSubmenu
              threadId={workspace.threadId}
              workspaceId={workspace.workspaceId}
              onCreateNew={() =>
                requestDialogOpen(() => setIsCreateWorkspaceOpen(true))
              }
            />
          )}
          {onDelete && (
            <DropdownMenuItem onClick={onDelete} variant="destructive">
              <Trash2 />
              <span>{t('chat.deleteThread')}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {workspace && (
        <CreateChatWorkspaceDialog
          threadId={workspace.threadId}
          open={isCreateWorkspaceOpen}
          onOpenChange={setIsCreateWorkspaceOpen}
        />
      )}
    </>
  );
}

/** Leads back to the notification or product update a chat was started about. */
function ChatSourceBadge({
  origin,
}: Readonly<Pick<ChatHeaderProps, 'origin'>>) {
  const { t } = useTranslation('chat');
  const routinesEnabled = useIsFeatureEnabled('routinesEnabled');
  const releaseNotesEnabled = useIsFeatureEnabled('releaseNotesEnabled');
  const sourceReleaseNoteId =
    origin?.kind === 'release_note' ? origin.releaseNoteId : null;
  const sourceNotificationId =
    origin?.kind === 'notification' ? origin.notificationId : null;

  if (releaseNotesEnabled && sourceReleaseNoteId) {
    return (
      <Badge variant="outline" asChild>
        <Link
          to="/news/$releaseNoteId"
          params={{ releaseNoteId: sourceReleaseNoteId }}
          data-testid="chat-source-release-note"
        >
          <Megaphone className="h-3 w-3" />
          {t('chat.fromReleaseNote')}
        </Link>
      </Badge>
    );
  }
  if (routinesEnabled && sourceNotificationId) {
    return (
      <Badge variant="outline" asChild>
        <Link
          to="/inbox/$notificationId"
          params={{ notificationId: sourceNotificationId }}
          data-testid="chat-source-notification"
        >
          <Inbox className="h-3 w-3" />
          {t('chat.fromNotification')}
        </Link>
      </Badge>
    );
  }
  return null;
}
