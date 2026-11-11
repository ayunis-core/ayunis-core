import { useTranslation } from 'react-i18next';
import { cn } from '@ayunis/ui/lib/cn';
import type { NotificationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { NOTIFICATIONS_PER_PAGE } from '@/pages/inbox/model/constants';
import { InboxListItem } from './InboxListItem';
import { InboxListPager } from './InboxListPager';

interface InboxListProps {
  notifications: NotificationResponseDto[];
  page: number;
  total: number;
  selectedId?: string;
  className?: string;
}

export function InboxList({
  notifications,
  page,
  total,
  selectedId,
  className,
}: Readonly<InboxListProps>) {
  const { t } = useTranslation('inbox');

  return (
    <aside
      aria-label={t('page.title')}
      className={cn(
        'flex w-full shrink-0 flex-col md:w-80 md:border-r lg:w-96',
        className,
      )}
    >
      <div
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2"
        data-testid="inbox-list"
      >
        {notifications.length === 0 && (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            {t('emptyState.title')}
          </p>
        )}
        {notifications.map((notification) => (
          <InboxListItem
            key={notification.id}
            notification={notification}
            isSelected={notification.id === selectedId}
          />
        ))}
      </div>
      <InboxListPager
        page={page}
        totalPages={Math.ceil(total / NOTIFICATIONS_PER_PAGE)}
      />
    </aside>
  );
}
