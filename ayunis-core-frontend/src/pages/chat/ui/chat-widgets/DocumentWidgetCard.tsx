import { Button } from '@/shared/ui/shadcn/button';
import { cn } from '@/shared/lib/shadcn/utils';
import { FileText, ExternalLink, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface DocumentWidgetCardProps {
  readonly contentKey: string;
  readonly contentId: string;
  readonly isStreaming?: boolean;
  readonly title: string;
  readonly statusLabel: ReactNode;
  readonly buttonLabel: string;
  readonly artifactId: string | null;
  readonly onOpen: () => void;
  readonly icon?: LucideIcon;
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
  icon: Icon = FileText,
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
          <Icon className="size-5 text-primary" />
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
