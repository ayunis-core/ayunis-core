import { useTranslation } from 'react-i18next';
import { MoreVertical, ShieldCheck, Trash2, Pencil } from 'lucide-react';
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

interface ChatHeaderProps {
  readonly threadTitle?: string;
  readonly isAnonymous: boolean;
  readonly onRename: (openDialog?: boolean) => void;
  readonly onDelete: () => void;
}

export default function ChatHeader({
  threadTitle,
  isAnonymous,
  onRename,
  onDelete,
}: Readonly<ChatHeaderProps>) {
  const { t } = useTranslation('chat');

  return (
    <ContentAreaHeader
      title={
        <span
          className="group inline-flex items-center gap-2"
          data-testid="header"
        >
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- intentional: empty string should show "Untitled" */}
          {threadTitle || t('chat.untitled')}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => onRename()}
                variant="ghost"
                className="opacity-0 group-hover:opacity-100"
                aria-label={t('chat.renameThread')}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('chat.renameThread')}</TooltipContent>
          </Tooltip>
          {isAnonymous && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">
                  <ShieldCheck className="h-3 w-3" />
                  {t('chat.anonymousMode')}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{t('chat.anonymousModeTooltip')}</TooltipContent>
            </Tooltip>
          )}
        </span>
      }
      action={
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
            <DropdownMenuItem onClick={onDelete} variant="destructive">
              <Trash2 className="h-4 w-4" />
              <span>{t('chat.deleteThread')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
}
