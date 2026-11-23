import { useRef, type ReactNode, type RefObject } from 'react';
import { cn } from '@ayunis/ui/lib/cn';

interface AssistantMessageFrameProps {
  readonly grouped: boolean;
  readonly children: ReactNode;
  readonly actions?: (
    contentRef: RefObject<HTMLDivElement | null>,
  ) => ReactNode;
}

export function AssistantMessageFrame({
  grouped,
  children,
  actions,
}: AssistantMessageFrameProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className={cn('flex flex-col items-start gap-2', !grouped && 'mt-4')}>
      <div className="max-w-2xl min-w-0 space-y-1 w-full">
        <div
          ref={contentRef}
          className="space-y-2 overflow-hidden w-full"
          data-testid="assistant-message"
        >
          {children}
        </div>
        {actions && (
          <div className="flex items-center gap-0.5">{actions(contentRef)}</div>
        )}
      </div>
    </div>
  );
}
