import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, FolderOpen } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import { WorkspacePickerMenuWithCreate } from '@/widgets/workspace-picker-menu';
import { CreateWorkspaceDialog } from '@/widgets/create-workspace-dialog';
import { useWorkspaces } from '@/features/workspaces';
import { useDropdownDialogTransition } from '@/shared/hooks/useDropdownDialogTransition';
import { TOUR_TARGET } from '@/widgets/onboarding';

const NEW_CHAT_ENTRANCE_MS = 900;

interface WorkspacePickerProps {
  workspaceId: string | null;
  onWorkspaceChange: (workspaceId: string | null) => void;
  isCompact?: boolean;
}

export function WorkspacePicker({
  workspaceId,
  onWorkspaceChange,
  isCompact = false,
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
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              isCompact &&
                'h-7 gap-1.5 px-2 text-[13px] font-normal text-muted-foreground hover:text-foreground has-[>svg]:px-2 [&_svg:not([class*=size-])]:size-3.5',
            )}
            data-tour={TOUR_TARGET.selectWorkspaceInChat}
            data-tour-settle={NEW_CHAT_ENTRANCE_MS}
          >
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
          <WorkspacePickerMenuWithCreate
            workspaces={workspaces}
            selectedWorkspaceId={workspaceId}
            onClear={() => onWorkspaceChange(null)}
            // Selecting the attached workspace again detaches it.
            onSelect={(workspace) =>
              onWorkspaceChange(
                workspace.id === workspaceId ? null : workspace.id,
              )
            }
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
