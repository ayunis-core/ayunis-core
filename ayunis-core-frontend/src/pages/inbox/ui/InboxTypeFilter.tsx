import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { NotificationTypeIcon } from '@/features/notifications';
import type { NotificationType } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface InboxTypeFilterProps {
  type: NotificationType;
}

export function InboxTypeFilter({ type }: Readonly<InboxTypeFilterProps>) {
  const { t } = useTranslation('inbox');

  return (
    <div
      className="ml-2 flex items-center gap-0.5"
      data-testid="inbox-type-filter"
      data-type={type}
    >
      <Badge variant="secondary">
        <NotificationTypeIcon type={type} />
        {t(`filter.type.${type}`)}
      </Badge>
      <Button variant="ghost" size="icon-xs" asChild>
        <Link
          to="."
          search={(prev) => ({ ...prev, type: undefined, page: undefined })}
          aria-label={t('filter.clear')}
          title={t('filter.clear')}
          data-testid="inbox-type-filter-clear"
        >
          <X />
        </Link>
      </Button>
    </div>
  );
}
