import { OrgLifecycleFilter as OrgLifecycleFilterValue } from '@/shared/api';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';

export default function OrgLifecycleFilter({
  lifecycle,
}: Readonly<{ lifecycle: OrgLifecycleFilterValue }>) {
  const navigate = useNavigate();
  const { t } = useTranslation('super-admin-settings-orgs');
  return (
    <Select
      value={lifecycle}
      onValueChange={(value: OrgLifecycleFilterValue) => {
        void navigate({
          to: '/super-admin-settings/orgs',
          search: (previous) => ({
            ...previous,
            orgLifecycle: value,
            page: undefined,
          }),
        });
      }}
    >
      <SelectTrigger
        data-testid="org-lifecycle-filter"
        className="w-48"
        aria-label={t('lifecycle.label')}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(OrgLifecycleFilterValue).map((value) => (
          <SelectItem
            key={value}
            value={value}
            data-testid={`org-lifecycle-filter-${value}`}
          >
            {t(`lifecycle.${value}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
