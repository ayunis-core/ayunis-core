import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/shadcn/utils';

interface ChatInputExpandableProps {
  show: boolean;
  children: ReactNode;
  className?: string;
}

/** Apple-like height reveal — grid 0fr → 1fr instead of an instant layout jump */
export function ChatInputExpandable({
  show,
  children,
  className,
}: Readonly<ChatInputExpandableProps>) {
  return (
    <div
      className={cn(
        'chat-input-expandable grid transition-[grid-template-rows,opacity,margin] duration-500 ease-[cubic-bezier(0.45,0.05,0.55,0.95)] motion-reduce:transition-none',
        show
          ? 'grid-rows-[1fr] opacity-100 mb-0'
          : 'grid-rows-[0fr] opacity-0 mb-0',
        className,
      )}
      aria-hidden={!show}
    >
      <div className="overflow-hidden min-h-0">{children}</div>
    </div>
  );
}
