import { PanelRight } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { cn } from '@ayunis/ui/lib/cn';

interface PanelToggleProps {
  resultCount: number;
  highlight: boolean;
  onToggle: () => void;
}

export function PanelToggle({
  resultCount,
  highlight,
  onToggle,
}: Readonly<PanelToggleProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Ergebnisse und Kontext"
          className={cn('relative transition-all', highlight && 'text-brand')}
          onClick={onToggle}
        >
          <PanelRight />
          {resultCount > 0 && (
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-brand" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Ergebnisse und Kontext</TooltipContent>
    </Tooltip>
  );
}
