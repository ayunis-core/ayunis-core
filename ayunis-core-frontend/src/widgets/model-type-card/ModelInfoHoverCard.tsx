import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/shared/ui/shadcn/popover';
import ModelInfoCard, { type ModelInfoModel } from './ModelInfoCard';

interface ModelInfoHoverCardProps {
  model: ModelInfoModel;
  children: ReactNode;
}

export default function ModelInfoHoverCard({
  model,
  children,
}: Readonly<ModelInfoHoverCardProps>) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const cancelScheduledClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  // Grace period so the cursor can travel from the trigger into the card
  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => cancelScheduledClose, []);

  return (
    <Popover open={open}>
      <PopoverAnchor asChild>
        <div
          className="w-fit"
          onMouseEnter={() => {
            cancelScheduledClose();
            setOpen(true);
          }}
          onMouseLeave={scheduleClose}
        >
          {children}
        </div>
      </PopoverAnchor>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="pointer-events-auto w-80"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={cancelScheduledClose}
        onMouseLeave={scheduleClose}
      >
        <ModelInfoCard model={model} />
      </PopoverContent>
    </Popover>
  );
}
