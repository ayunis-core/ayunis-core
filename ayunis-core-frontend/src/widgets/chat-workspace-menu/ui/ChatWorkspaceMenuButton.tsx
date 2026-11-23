import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen } from 'lucide-react';
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
import { useDropdownDialogTransition } from '@/shared/hooks/useDropdownDialogTransition';
import { ChatWorkspacePicker } from './ChatWorkspacePicker';
import { CreateChatWorkspaceDialog } from './CreateChatWorkspaceDialog';

interface ChatWorkspaceMenuButtonProps {
  threadId: string;
  workspaceId?: string | null;
}

/** Icon-button form of the chat workspace menu, for chat list rows. */
export function ChatWorkspaceMenuButton({
  threadId,
  workspaceId,
}: Readonly<ChatWorkspaceMenuButtonProps>) {
  const { t } = useTranslation('common');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { requestDialogOpen, handleCloseAutoFocus } =
    useDropdownDialogTransition();
  const label = t('sidebar.addToWorkspace');

  return (
    <>
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
          onCloseAutoFocus={handleCloseAutoFocus}
        >
          <ChatWorkspacePicker
            threadId={threadId}
            workspaceId={workspaceId}
            onCreateNew={() => requestDialogOpen(() => setIsCreateOpen(true))}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateChatWorkspaceDialog
        threadId={threadId}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </>
  );
}
