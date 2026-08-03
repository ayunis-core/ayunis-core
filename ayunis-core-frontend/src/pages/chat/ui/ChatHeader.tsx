import { useTranslation } from 'react-i18next';
import { MoreVertical, ShieldCheck, Trash2, Pencil, Star } from 'lucide-react';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { Button } from '@/shared/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import { Badge } from '@/shared/ui/shadcn/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import {
  usePinnedThreadIds,
  toggleThreadPinned,
} from '@/features/usePinnedThreads';
import { cn } from '@/shared/lib/shadcn/utils';

interface ChatHeaderProps {
  readonly threadId: string;
  readonly threadTitle?: string;
  readonly isAnonymous: boolean;
  readonly onRename: (openDialog?: boolean) => void;
  readonly onDelete: () => void;
}

export default function ChatHeader({
  threadId,
  threadTitle,
  isAnonymous,
  onRename,
  onDelete,
}: Readonly<ChatHeaderProps>) {
  const { t } = useTranslation('chat');
  const pinnedThreadIds = usePinnedThreadIds();
  const isPinned = pinnedThreadIds.includes(threadId);

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
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => toggleThreadPinned(threadId)}
                variant="ghost"
                size="icon"
                aria-label={isPinned ? 'Nicht mehr anheften' : 'Anheften'}
              >
                <Star
                  className={cn(
                    'h-3.5 w-3.5',
                    isPinned
                      ? 'fill-brand text-brand'
                      : 'text-muted-foreground',
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPinned ? 'Nicht mehr anheften' : 'Anheften'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => onRename()}
                variant="ghost"
                size="icon"
                aria-label={t('chat.renameThread')}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('chat.renameThread')}</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5 text-primary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRename(true)}>
                <Pencil className="h-4 w-4" />
                <span>{t('chat.renameThread')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleThreadPinned(threadId)}>
                <Star
                  className={cn('h-4 w-4', isPinned && 'fill-brand text-brand')}
                />
                <span>{isPinned ? 'Nicht mehr anheften' : 'Anheften'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} variant="destructive">
                <Trash2 />
                <span>{t('chat.deleteThread')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}
