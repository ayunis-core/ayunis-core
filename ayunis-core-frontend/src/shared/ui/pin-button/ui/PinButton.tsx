import { Star } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';

interface PinButtonProps {
  isPinned: boolean;
  pinLabel: string;
  unpinLabel: string;
  onToggle: () => void;
  tourTarget?: string;
}

export function PinButton({
  isPinned,
  pinLabel,
  unpinLabel,
  onToggle,
  tourTarget,
}: Readonly<PinButtonProps>) {
  const label = isPinned ? unpinLabel : pinLabel;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={onToggle}
            data-tour={tourTarget}
          >
            <Star className={cn(isPinned && 'fill-brand text-brand')} />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
