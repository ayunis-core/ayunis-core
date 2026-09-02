import { Library } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { cn } from '@ayunis/ui/lib/cn';
import type { PanelKey } from '@/widgets/prototype-journey/model/journey';

interface EntryControlsProps {
  resultCount: number;
  activePanel: PanelKey | null;
  highlight: PanelKey | null;
  onOpen: (panel: PanelKey) => void;
}

export function EntryControls({
  resultCount,
  activePanel,
  highlight,
  onOpen,
}: Readonly<EntryControlsProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={activePanel ? 'secondary' : 'ghost'}
          size="icon"
          aria-label="Ergebnisse und Kontext"
          className={cn('relative transition-all', highlight && 'text-brand')}
          onClick={() => onOpen('results')}
        >
          <Library />
          {resultCount > 0 && (
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-brand" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Ergebnisse und Kontext</TooltipContent>
    </Tooltip>
  );
}
