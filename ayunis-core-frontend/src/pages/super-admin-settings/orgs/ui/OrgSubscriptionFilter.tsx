import { SuperAdminOrgsControllerGetAllOrgsSubscription } from '@/shared/api';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';

export default function OrgSubscriptionFilter({
  subscription,
}: Readonly<{ subscription: SuperAdminOrgsControllerGetAllOrgsSubscription }>) {
  const navigate = useNavigate();
  const { t } = useTranslation('super-admin-settings-orgs');
  return (
    <Select
      value={subscription}
      onValueChange={(
        value: SuperAdminOrgsControllerGetAllOrgsSubscription,
      ) => {
        void navigate({
          to: '/super-admin-settings/orgs',
          search: (previous) => ({
            ...previous,
            orgSubscription: value,
            page: undefined,
          }),
        });
      }}
    >
      <SelectTrigger
        data-testid="org-subscription-filter"
        className="w-48"
        aria-label={t('subscriptionFilter.label')}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(SuperAdminOrgsControllerGetAllOrgsSubscription).map(
          (value) => (
            <SelectItem
              key={value}
              value={value}
              data-testid={`org-subscription-filter-${value}`}
            >
              {t(`subscriptionFilter.${value}`)}
            </SelectItem>
          ),
        )}
      </SelectContent>
    </Select>
  );
}
