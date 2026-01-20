import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';

interface OrgsSubscriptionFilterProps {
  hasActiveSubscription?: 'all' | 'true' | 'false';
  search?: string;
}

export default function OrgsSubscriptionFilter({
  hasActiveSubscription = 'all',
  search,
}: OrgsSubscriptionFilterProps) {
  const { t } = useTranslation('super-admin-settings-orgs');
  const navigate = useNavigate();

  const handleFilterChange = (value: string) => {
    void navigate({
      to: '/super-admin-settings/orgs',
      search: {
        search: search || undefined,
        hasActiveSubscription:
          value === 'all' ? undefined : (value as 'true' | 'false'),
        page: undefined, // Reset to page 1 when filter changes
      },
    });
  };

  return (
    <Select value={hasActiveSubscription} onValueChange={handleFilterChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={t('filter.subscription.placeholder')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('filter.subscription.all')}</SelectItem>
        <SelectItem value="true">{t('filter.subscription.active')}</SelectItem>
        <SelectItem value="false">
          {t('filter.subscription.inactive')}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
