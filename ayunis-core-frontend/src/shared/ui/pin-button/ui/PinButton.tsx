import { Star } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';

interface PinButtonProps {
  isPinned: boolean;
  pinLabel: string;
  unpinLabel: string;
  onToggle: () => void;
}

export function PinButton({
  isPinned,
  pinLabel,
  unpinLabel,
  onToggle,
}: Readonly<PinButtonProps>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isPinned ? unpinLabel : pinLabel}
      onClick={onToggle}
    >
      <Star className={cn(isPinned && 'fill-brand text-brand')} />
    </Button>
  );
}
