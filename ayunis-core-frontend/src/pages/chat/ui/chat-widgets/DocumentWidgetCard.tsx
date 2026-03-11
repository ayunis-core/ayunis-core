import { Button } from '@/shared/ui/shadcn/button';
import { cn } from '@/shared/lib/shadcn/utils';
import { FileText, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

interface DocumentWidgetCardProps {
  contentKey: string;
  contentId: string;
  isStreaming?: boolean;
  title: string;
  statusLabel: ReactNode;
  buttonLabel: string;
  artifactId: string | null;
  onOpen: () => void;
}

export function DocumentWidgetCard({
  contentKey,
  contentId,
  isStreaming = false,
  title,
  statusLabel,
  buttonLabel,
  artifactId,
  onOpen,
}: DocumentWidgetCardProps) {
  return (
    <div
      className="my-2 w-full rounded-lg border bg-card p-4"
      key={`${contentKey}-${contentId}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-lg bg-primary/10',
            isStreaming && 'animate-pulse',
          )}
        >
          <FileText className="size-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm font-medium truncate',
              isStreaming && 'animate-pulse',
            )}
          >
            {title}
          </p>
          <p className="text-xs text-muted-foreground">{statusLabel}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          disabled={!artifactId}
          onClick={onOpen}
        >
          <ExternalLink className="mr-1 size-3.5" />
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
