import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { cn } from '@ayunis/ui/lib/cn';

interface ReadToggleButtonProps {
  isUnread: boolean;
  onToggle: () => void;
  className?: string;
}

export function ReadToggleButton({
  isUnread,
  onToggle,
  className,
}: Readonly<ReadToggleButtonProps>) {
  const label = isUnread ? 'Als gelesen markieren' : 'Als ungelesen markieren';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={!isUnread}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggle();
          }}
          className={cn('size-6 rounded-full', className)}
        >
          <span
            className={cn(
              'size-2 rounded-full transition-colors',
              isUnread
                ? 'bg-brand'
                : 'border border-muted-foreground/60 bg-transparent',
            )}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
