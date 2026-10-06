import { ChevronDown, Link2, Plus } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';

export function AddKnowledgeMenu({
  onLinkExisting,
  onCreate,
}: Readonly<{ onLinkExisting: () => void; onCreate: () => void }>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          Wissenssammlung hinzufügen
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onLinkExisting}>
          <Link2 />
          Vorhandene verknüpfen
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onCreate}>
          <Plus />
          Neu erstellen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
