import { useTranslation } from 'react-i18next';
import {
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

interface ChatHeaderProps {
  readonly threadId: string;
  readonly threadTitle?: string;
  readonly isAnonymous: boolean;
  readonly workspaceId?: string | null;
  readonly isArtifactPanelOpen: boolean;
  readonly onToggleArtifactPanel: () => void;
  readonly onRename: () => void;
  readonly onDelete: () => void;
}

export default function ChatHeader({
  threadId,
  threadTitle,
  isAnonymous,
  workspaceId,
  isArtifactPanelOpen,
  onToggleArtifactPanel,
  onRename,
  onDelete,
}: Readonly<ChatHeaderProps>) {
  const { t } = useTranslation('chat');
  const { t: tCommon } = useTranslation('common');
  const { t: tWorkspace } = useTranslation('workspace');
  const isWorkspacesEnabled = useIsWorkspacesEnabled();
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

  return (
    <ContentAreaHeader
      breadcrumbs={breadcrumbs}
      badge={anonymousBadge}
      action={
        <div className="flex items-center gap-1">
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
          <Button
            variant={isArtifactPanelOpen ? 'secondary' : 'ghost'}
            size="icon"
            data-testid="chat-side-panel-toggle"
            onClick={onToggleArtifactPanel}
            aria-label={t('chat.sidePanel.open')}
            aria-pressed={isArtifactPanelOpen}
          >
            <PanelRight className="h-5 w-5 text-primary" />
          </Button>
        </div>
      }
    />
  );
}
