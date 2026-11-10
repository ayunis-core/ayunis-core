import { Link } from '@tanstack/react-router';
import { CalendarClock, CircleAlert, ListTodo, Megaphone } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import type {
  FeedItem,
  FeedKind,
} from '@/features/home-feed/model/useHomeFeed';

interface LinkProps {
  className?: string;
  children: React.ReactNode;
}

export function FeedItemLink({
  item,
  className,
  children,
}: Readonly<LinkProps & { item: FeedItem }>) {
  if (item.notificationId) {
    return (
      <Link
        to="/inbox/$notificationId"
        params={{ notificationId: item.notificationId }}
        className={className}
      >
        {children}
      </Link>
    );
  }
  return (
    <Link to="/inbox" className={className}>
      {children}
    </Link>
  );
}

const KIND_ICON = {
  routine: CalendarClock,
  routine_error: CircleAlert,
  news: Megaphone,
  task: ListTodo,
} as const;

export function FeedIcon({
  kind,
  className,
}: Readonly<{ kind: FeedKind | 'task'; className?: string }>) {
  const Icon = KIND_ICON[kind];
  return (
    <Icon
      className={cn(
        'size-4 shrink-0',
        kind === 'routine_error' ? 'text-destructive' : 'text-muted-foreground',
        className,
      )}
      aria-hidden
    />
  );
}

export function UnreadDot({ className }: Readonly<{ className?: string }>) {
  return (
    <span
      className={cn('relative flex size-2 shrink-0', className)}
      aria-hidden
    >
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-brand" />
    </span>
  );
}
