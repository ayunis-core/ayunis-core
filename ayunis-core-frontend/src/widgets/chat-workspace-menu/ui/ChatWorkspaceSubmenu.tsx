import { useTranslation } from 'react-i18next';
import { FolderOpen } from 'lucide-react';
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import {
  ChatWorkspacePicker,
  type ChatWorkspacePickerProps,
} from './ChatWorkspacePicker';

/**
 * The "add to workspace" entry of a chat's actions menu. `onCreateNew` must
 * open `CreateChatWorkspaceDialog` outside the menu, which unmounts on close.
 */
export function ChatWorkspaceSubmenu(
  props: Readonly<ChatWorkspacePickerProps>,
) {
  const { t } = useTranslation('common');

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <FolderOpen />
        <span>{t('sidebar.addToWorkspace')}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <ChatWorkspacePicker {...props} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
