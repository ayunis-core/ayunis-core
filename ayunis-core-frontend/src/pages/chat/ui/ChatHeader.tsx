import { useTranslation } from 'react-i18next';
import { MoreVertical, Pencil, ShieldCheck, Star, Trash2 } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import { useToggleThreadPinned } from '@/features/workspaces';
import { useIsWorkspacesEnabled } from '@/features/feature-toggles';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { Button } from '@ayunis/ui/components/button';
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
  readonly isPinned: boolean;
  readonly onRename: () => void;
  readonly onDelete: () => void;
}

export default function ChatHeader({
  threadId,
  threadTitle,
  isAnonymous,
  isPinned,
  onRename,
  onDelete,
}: Readonly<ChatHeaderProps>) {
  const { t } = useTranslation('chat');
  const { t: tCommon } = useTranslation('common');
  const isWorkspacesEnabled = useIsWorkspacesEnabled();
  const { mutate: togglePinned } = useToggleThreadPinned();

  const displayTitle = threadTitle || t('chat.untitled');

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
      breadcrumbs={[
        { label: t('chat.chats'), href: '/chats' },
        { label: displayTitle },
      ]}
      badge={anonymousBadge}
      action={
        <div className="flex items-center gap-1">
          {isWorkspacesEnabled && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                isPinned
                  ? tCommon('sidebar.unpinChat')
                  : tCommon('sidebar.pinChat')
              }
              onClick={() => togglePinned(threadId)}
            >
              <Star
                className={cn('h-5 w-5', isPinned && 'fill-brand text-brand')}
              />
            </Button>
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
