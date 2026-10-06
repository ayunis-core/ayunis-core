import { Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';

export function DeleteSkillButton({
  onClick,
}: Readonly<{ onClick: () => void }>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          aria-label="Löschen"
          onClick={onClick}
        >
          <Trash2 />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Löschen</TooltipContent>
    </Tooltip>
  );
}
