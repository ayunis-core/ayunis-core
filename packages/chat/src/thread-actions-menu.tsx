import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import type { ChatViewConfig, ChatWorkspaces } from './chat-config';
import { useConfirmDialog } from './confirm-dialog';
import { RenameThreadDialog } from './history/ThreadDialogs';
import type { ChatRunLifecycle } from './run-lifecycle';
import { WorkspacePickerMenuWithCreate } from './workspaces/WorkspacePickerMenuWithCreate';
import { useMenuDialogTransition } from './workspaces/use-menu-dialog-transition';
import { useDeleteThread, useRenameThread } from './use-thread-actions';

export type HeaderThread = Pick<
  GetThreadResponseDto,
  'id' | 'isAnonymous' | 'workspaceId' | 'origin'
>;

interface ThreadActionsMenuProps {
  readonly config: ChatViewConfig;
  readonly lifecycle: ChatRunLifecycle;
  readonly thread: HeaderThread;
  readonly title?: string;
}

/** Asks before deleting the chat, in the confirmation the chat uses everywhere. */
function useDeleteRequest(
  config: ChatViewConfig,
  lifecycle: ChatRunLifecycle,
  threadId: string,
) {
  const { t } = useTranslation('chat');
  const deleteThread = useDeleteThread(config, lifecycle);
  const { confirm, dialog } = useConfirmDialog();
  const requestDelete = () =>
    confirm({
      title: t('chat.deleteThreadTitle'),
      description: t('chat.deleteThreadDescription'),
      confirmText: t('chat.deleteText'),
      cancelText: t('chat.cancelText'),
      destructive: true,
      onConfirm: () => deleteThread(threadId),
    });
  return { requestDelete, dialog };
}

export function ThreadActionsMenu({
  config,
  lifecycle,
  thread,
  title,
}: ThreadActionsMenuProps) {
  const [renaming, setRenaming] = useState(false);
  const rename = useRenameThread(lifecycle, () => setRenaming(false));
  const deletion = useDeleteRequest(config, lifecycle, thread.id);
  return (
    <>
      <ThreadMenu
        config={config}
        thread={thread}
        onRename={() => setTimeout(() => setRenaming(true), 0)}
        onDelete={deletion.requestDelete}
      />
      <RenameThreadDialog
        open={renaming}
        onOpenChange={setRenaming}
        currentTitle={title ?? null}
        busy={rename.isPending}
        onRename={(value) =>
          rename.mutate({ threadId: thread.id, title: value })
        }
      />
      {deletion.dialog}
    </>
  );
}

function ThreadMenu({
  config,
  thread,
  onRename,
  onDelete,
}: Readonly<{
  config: ChatViewConfig;
  thread: HeaderThread;
  onRename: () => void;
  onDelete: () => void;
}>) {
  const { t } = useTranslation('chat');
  const transition = useMenuDialogTransition();
  const { workspaces } = config;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5 text-primary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={transition.handleCloseAutoFocus}
      >
        <DropdownMenuItem onClick={onRename}>
          <Pencil className="h-4 w-4" />
          <span>{t('chat.renameThread')}</span>
        </DropdownMenuItem>
        {workspaces && (
          <WorkspaceSubmenu
            workspaces={workspaces}
            thread={thread}
            onCreateNew={() =>
              transition.requestDialogOpen(() => workspaces.create(thread.id))
            }
          />
        )}
        <DropdownMenuItem onClick={onDelete} variant="destructive">
          <Trash2 />
          <span>{t('chat.deleteThread')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WorkspaceSubmenu({
  workspaces,
  thread,
  onCreateNew,
}: Readonly<{
  workspaces: ChatWorkspaces;
  thread: HeaderThread;
  onCreateNew: () => void;
}>) {
  const { t } = useTranslation('common');
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <FolderOpen />
        <span>{t('sidebar.addToWorkspace')}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <WorkspacePickerMenuWithCreate
          workspaces={workspaces.items}
          selectedWorkspaceId={thread.workspaceId}
          onClear={() => workspaces.moveThread(thread.id, null)}
          onSelect={(workspace) =>
            workspaces.moveThread(thread.id, workspace.id)
          }
          onCreateNew={onCreateNew}
        />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
