import type { ReactNode } from 'react';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@ayunis/ui/components/popover';

interface MenuHoverCardProps {
  card: ReactNode;
  onCardEnter: () => void;
  onLeave: () => void;
  children: ReactNode;
}

export function MenuHoverCard({
  card,
  onCardEnter,
  onLeave,
  children,
}: Readonly<MenuHoverCardProps>) {
  return (
    <Popover open={!!card}>
      <PopoverAnchor asChild>
        <div onMouseLeave={onLeave}>{children}</div>
      </PopoverAnchor>
      <PopoverContent
        side="left"
        align="start"
        sideOffset={12}
        alignOffset={-4}
        className="pointer-events-auto w-80"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={onCardEnter}
        onMouseLeave={onLeave}
      >
        {card}
      </PopoverContent>
    </Popover>
  );
}
