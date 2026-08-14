import { useTranslation } from 'react-i18next';
import { MoreVertical, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from '@/features/favorites';
import { useWorkspaces } from '@/features/workspaces';
import { useIsWorkspacesEnabled } from '@/features/feature-toggles';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
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
import type { WorkspaceContextResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { WorkspaceContextPanel } from './WorkspaceContextSidePanel';
import { WorkspaceContextHeaderActions } from './WorkspaceContextHeaderActions';

interface ChatHeaderProps {
  readonly threadId: string;
  readonly threadTitle?: string;
  readonly isAnonymous: boolean;
  readonly workspaceId?: string | null;
  readonly workspaceContext?: WorkspaceContextResponseDto;
  readonly activeWorkspaceContextPanel?: WorkspaceContextPanel | null;
  readonly onToggleWorkspaceContextPanel?: (
    panel: WorkspaceContextPanel,
  ) => void;
  readonly onRename: () => void;
  readonly onDelete: () => void;
}

export default function ChatHeader({
  threadId,
  threadTitle,
  isAnonymous,
  workspaceId,
  workspaceContext,
  activeWorkspaceContextPanel,
  onToggleWorkspaceContextPanel,
  onRename,
  onDelete,
}: Readonly<ChatHeaderProps>) {
  const { t } = useTranslation('chat');
  const { t: tCommon } = useTranslation('common');
  const isWorkspacesEnabled = useIsWorkspacesEnabled();
  const { favorites } = useFavorites();
  const { toggle: togglePinned } = useToggleFavorite();
  const { workspaces } = useWorkspaces();
  const isPinned = isFavorite(favorites, threadId, 'thread');

  const displayTitle = threadTitle || t('chat.untitled');
  // A chat filed under a workspace is presented as the workspace's child, so
  // the parent crumb leads back to the workspace instead of the chats list.
  // Falls back to "Chats" when the workspace is not loadable (flag off,
  // workspace deleted).
  const workspace = workspaceId
    ? workspaces.find((w) => w.id === workspaceId)
    : undefined;
  const parentCrumb = workspace
    ? { label: workspace.name, href: `/workspaces/${workspace.id}` }
    : { label: t('chat.chats'), href: '/chats' };

  const anonymousBadge = isAnonymous ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary">
          <ShieldCheck className="h-3 w-3" />
          {t('chat.anonymousMode')}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{t('chat.anonymousModeTooltip')}</TooltipContent>
    </Tooltip>
  ) : undefined;

  const contextActions = workspaceContext ? (
    <WorkspaceContextHeaderActions
      context={workspaceContext}
      activePanel={activeWorkspaceContextPanel ?? null}
      onToggle={onToggleWorkspaceContextPanel}
    />
  ) : null;

  return (
    <ContentAreaHeader
      breadcrumbs={[parentCrumb, { label: displayTitle }]}
      badge={anonymousBadge}
      action={
        <div className="flex items-center gap-1">
          {contextActions}
          {isWorkspacesEnabled && (
            <PinButton
              isPinned={isPinned}
              pinLabel={tCommon('sidebar.pinChat')}
              unpinLabel={tCommon('sidebar.unpinChat')}
              onToggle={() => togglePinned('thread', threadId)}
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5 text-primary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename}>
                <Pencil className="h-4 w-4" />
                <span>{t('chat.renameThread')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} variant="destructive">
                <Trash2 />
                <span>{t('chat.deleteThread')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    />
  );
}
