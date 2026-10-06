import { ArrowRightLeft, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';

export function WorkspaceMoreMenu({
  isOwner,
  onEdit,
  onTransfer,
  onDelete,
}: Readonly<{
  isOwner: boolean;
  onEdit: () => void;
  onTransfer: () => void;
  onDelete: () => void;
}>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Weitere Aktionen für den Arbeitsbereich"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil />
          <span>Arbeitsbereich bearbeiten</span>
        </DropdownMenuItem>
        {isOwner && (
          <>
            <DropdownMenuItem onClick={onTransfer}>
              <ArrowRightLeft />
              <span>Eigentum übertragen</span>
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 />
              <span>Arbeitsbereich löschen</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
