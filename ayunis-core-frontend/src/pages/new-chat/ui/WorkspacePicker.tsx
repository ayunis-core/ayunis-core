import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, FolderOpen } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import { WorkspacePickerMenuWithCreate } from '@/widgets/workspace-picker-menu';
import { CreateWorkspaceDialog } from '@/widgets/create-workspace-dialog';
import { useWorkspaces } from '@/features/workspaces';
import { useDropdownDialogTransition } from '@/shared/hooks/useDropdownDialogTransition';

interface WorkspacePickerProps {
  workspaceId: string | null;
  onWorkspaceChange: (workspaceId: string | null) => void;
}

export function WorkspacePicker({
  workspaceId,
  onWorkspaceChange,
}: Readonly<WorkspacePickerProps>) {
  const { t } = useTranslation('workspaces');
  const { workspaces } = useWorkspaces();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { requestDialogOpen, handleCloseAutoFocus } =
    useDropdownDialogTransition();

  const selected = workspaces.find((workspace) => workspace.id === workspaceId);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            {selected ? (
              <WorkspaceIcon
                icon={selected.icon}
                color={selected.color}
                variant="plain"
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
        <DropdownMenuContent
          align="start"
          onCloseAutoFocus={handleCloseAutoFocus}
        >
          <DropdownMenuItem onClick={() => onWorkspaceChange(null)}>
            <FolderOpen />
            <span>{t('picker.noWorkspace')}</span>
            {workspaceId === null && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <WorkspacePickerMenuWithCreate
            workspaces={workspaces}
            selectedWorkspaceId={workspaceId}
            onSelect={(workspace) => onWorkspaceChange(workspace.id)}
            onCreateNew={() => requestDialogOpen(() => setIsCreateOpen(true))}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {isCreateOpen && (
        <CreateWorkspaceDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onCreated={(workspace) => onWorkspaceChange(workspace.id)}
        />
      )}
    </>
  );
}
