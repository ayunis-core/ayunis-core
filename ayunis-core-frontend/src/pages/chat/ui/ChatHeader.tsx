import { useTranslation } from 'react-i18next';
import {
  MoreVertical,
  ShieldCheck,
  Trash2,
  Pencil,
  SquarePen,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { Button } from '@ayunis/ui/components/button';
import { useEmbedded } from '@/shared/contexts/embedded/useEmbedded';
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
  readonly threadTitle?: string;
  readonly isAnonymous: boolean;
  readonly onRename: () => void;
  readonly onDelete: () => void;
}

export default function ChatHeader({
  threadTitle,
  isAnonymous,
  onRename,
  onDelete,
}: Readonly<ChatHeaderProps>) {
  const { t } = useTranslation('chat');
  const isEmbedded = useEmbedded();
  const navigate = useNavigate();

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
          {isEmbedded && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('newChat.newChat')}
                  onClick={() => void navigate({ to: '/chat' })}
                >
                  <SquarePen className="h-5 w-5 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('newChat.newChat')}</TooltipContent>
            </Tooltip>
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
