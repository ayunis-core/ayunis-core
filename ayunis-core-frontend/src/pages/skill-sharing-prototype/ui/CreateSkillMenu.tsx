import { ChevronDown, Link2, PenLine, Sparkles, Store } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { useStartGuidedCreation } from '@/pages/skill-sharing-prototype/model/useStartGuidedCreation';

export function CreateSkillMenu({
  workspaceName,
  onLinkExisting,
  onCreateYourself,
}: Readonly<{
  workspaceName?: string;
  onLinkExisting?: () => void;
  onCreateYourself?: () => void;
}>) {
  const startGuidedCreation = useStartGuidedCreation(workspaceName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          Fähigkeit hinzufügen
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onLinkExisting && (
          <>
            <DropdownMenuItem onSelect={onLinkExisting}>
              <Link2 />
              Vorhandene verknüpfen
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={onCreateYourself}>
          <PenLine />
          Selbst erstellen
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => startGuidedCreation()}>
          <Sparkles />
          Mit Ayunis Core erstellen
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Store />
          Aus dem Marketplace hinzufügen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
