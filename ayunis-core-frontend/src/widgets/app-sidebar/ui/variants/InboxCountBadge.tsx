import { cn } from '@ayunis/ui/lib/cn';
import { formatUnreadCount } from '@/features/notifications';
import './sidebar-variants.css';

interface InboxCountBadgeProps {
  unreadCount: number;
  showCount?: boolean;
  className?: string;
}

export function InboxCountBadge({
  unreadCount,
  showCount = true,
  className,
}: Readonly<InboxCountBadgeProps>) {
  const label = formatUnreadCount(unreadCount);
  if (!label) return null;
  return (
    <span
      className={cn('pointer-events-none absolute flex', className)}
      aria-hidden
    >
      <span className="sidebar-soft-ping absolute inset-0 rounded-full bg-brand" />
      <span
        data-testid="sidebar-inbox-unread-count"
        className={cn(
          'relative inline-flex items-center justify-center rounded-full bg-brand text-brand-foreground ring-2 ring-sidebar tabular-nums',
          showCount
            ? 'h-4 min-w-4 px-1 text-[10px] leading-none font-semibold'
            : 'size-2',
        )}
      >
        {showCount && label}
      </span>
    </span>
  );
}
