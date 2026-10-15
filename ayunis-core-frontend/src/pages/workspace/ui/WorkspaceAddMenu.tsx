import type { ReactNode } from 'react';
import { ChevronDown, Link2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { useDropdownDialogTransition } from '@/shared/hooks/useDropdownDialogTransition';

export function WorkspaceAddMenu({
  label,
  linkLabel,
  createLabel,
  createIcon,
  testIdPrefix,
  onLinkExisting,
  onCreate,
}: Readonly<{
  label: string;
  linkLabel: string;
  createLabel: string;
  createIcon: ReactNode;
  testIdPrefix: string;
  onLinkExisting: () => void;
  onCreate: () => void;
}>) {
  const { requestDialogOpen, handleCloseAutoFocus } =
    useDropdownDialogTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" data-testid={`${testIdPrefix}-add-menu`}>
          {label}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onCloseAutoFocus={handleCloseAutoFocus}>
        <DropdownMenuItem
          data-testid={`${testIdPrefix}-link-existing`}
          onClick={() => requestDialogOpen(onLinkExisting)}
        >
          <Link2 />
          <span>{linkLabel}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid={`${testIdPrefix}-create`}
          onClick={() => requestDialogOpen(onCreate)}
        >
          {createIcon}
          <span>{createLabel}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
