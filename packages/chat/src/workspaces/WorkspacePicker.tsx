import { useTranslation } from 'react-i18next';
import { ChevronDown, FolderOpen } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import type { ChatWorkspace } from './chat-workspace';
import { useMenuDialogTransition } from './use-menu-dialog-transition';
import { WorkspaceIcon } from './WorkspaceIcon';
import { WorkspacePickerMenuWithCreate } from './WorkspacePickerMenuWithCreate';

const NEW_CHAT_ENTRANCE_MS = 900;

interface WorkspacePickerProps {
  readonly workspaces: readonly ChatWorkspace[];
  readonly selectedId: string | null;
  readonly onSelect: (workspaceId: string | null) => void;
  /** Opens the host's workspace creation once the menu has closed. */
  readonly onCreate: () => void;
  readonly tourTarget?: string;
}

function WorkspacePickerTrigger({
  selected,
  tourTarget,
}: Readonly<{ selected?: ChatWorkspace; tourTarget?: string }>) {
  const { t } = useTranslation('workspaces');
  return (
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 gap-1.5 px-2 text-[13px] font-normal hover:text-foreground has-[>svg]:px-2 [&_svg:not([class*=size-])]:size-3.5',
          selected ? 'text-foreground' : 'text-muted-foreground',
        )}
        data-tour={tourTarget}
        data-testid="new-chat-workspace-picker"
        data-tour-settle={tourTarget ? NEW_CHAT_ENTRANCE_MS : undefined}
      >
        {selected ? (
          <WorkspaceIcon
            icon={selected.icon}
            color={selected.color}
            variant="plain"
            className="size-3.5 [&>svg]:size-3.5"
          />
        ) : (
          <FolderOpen />
        )}
        <span className="truncate">
          {selected?.name ?? t('picker.placeholder')}
        </span>
        <ChevronDown />
      </Button>
    </DropdownMenuTrigger>
  );
}

/** Files the new chat under a workspace; picking the selected one again detaches it. */
export function WorkspacePicker({
  workspaces,
  selectedId,
  onSelect,
  onCreate,
  tourTarget,
}: WorkspacePickerProps) {
  const { requestDialogOpen, handleCloseAutoFocus } = useMenuDialogTransition();
  return (
    <DropdownMenu>
      <WorkspacePickerTrigger
        selected={workspaces.find(({ id }) => id === selectedId)}
        tourTarget={tourTarget}
      />
      <DropdownMenuContent
        align="start"
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <WorkspacePickerMenuWithCreate
          workspaces={workspaces}
          selectedWorkspaceId={selectedId}
          onClear={() => onSelect(null)}
          onSelect={(workspace) =>
            onSelect(workspace.id === selectedId ? null : workspace.id)
          }
          onCreateNew={() => requestDialogOpen(onCreate)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
