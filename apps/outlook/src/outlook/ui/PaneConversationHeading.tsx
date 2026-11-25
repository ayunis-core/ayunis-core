import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreVertical, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Badge } from '@ayunis/ui/components/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { PaneHeading } from '@/outlook/ui/PaneHeading';
import {
  PaneDeleteDialog,
  PaneRenameDialog,
} from '@/outlook/ui/PaneThreadDialogs';

export function PaneConversationHeading({
  title,
  anonymous,
  onNewChat,
  rename,
  remove,
}: Readonly<{
  title?: string;
  anonymous: boolean;
  onNewChat: () => void;
  rename?: (title: string) => void;
  remove?: () => void;
}>) {
  const { t } = useTranslation('chat');
  const [newTitle, setNewTitle] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const displayTitle = title || t('chat.untitled');

  return (
    <PaneHeading
      title={displayTitle}
      badge={
        anonymous && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary">
                <ShieldCheck className="h-3 w-3" />
                {t('chat.anonymousMode')}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{t('chat.anonymousModeTooltip')}</TooltipContent>
          </Tooltip>
        )
      }
      actions={
        <>
          <Button
            type="button"
            size="sm"
            data-testid="embedded-new-chat"
            onClick={onNewChat}
          >
            {t('newChat.newChat')}
          </Button>
          {(rename || remove) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5 text-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {rename && (
                  <DropdownMenuItem onSelect={() => setNewTitle(displayTitle)}>
                    <Pencil className="h-4 w-4" />
                    <span>{t('chat.renameThread')}</span>
                  </DropdownMenuItem>
                )}
                {remove && (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setDeleting(true)}
                  >
                    <Trash2 />
                    <span>{t('chat.deleteThread')}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <PaneRenameDialog
            title={newTitle}
            onChange={setNewTitle}
            onClose={() => setNewTitle(null)}
            onRename={(value) => {
              rename?.(value);
              setNewTitle(null);
            }}
          />
          <PaneDeleteDialog
            title={displayTitle}
            open={deleting}
            onClose={() => setDeleting(false)}
            onDelete={() => remove?.()}
          />
        </>
      }
    />
  );
}
