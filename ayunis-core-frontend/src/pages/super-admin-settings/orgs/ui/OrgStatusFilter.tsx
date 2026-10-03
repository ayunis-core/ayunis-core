import { SuperAdminOrgsControllerGetAllOrgsStatus } from '@/shared/api';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
export default function OrgStatusFilter({
  status,
}: Readonly<{ status: SuperAdminOrgsControllerGetAllOrgsStatus }>) {
  const navigate = useNavigate();
  const { t } = useTranslation('super-admin-settings-orgs');
  return (
    <Select
      value={status}
      onValueChange={(value: SuperAdminOrgsControllerGetAllOrgsStatus) => {
        void navigate({
          to: '/super-admin-settings/orgs',
          search: (previous) => ({
            ...previous,
            orgStatus: value,
            page: undefined,
          }),
        });
      }}
    >
      <SelectTrigger
        data-testid="org-status-filter"
        className="w-48"
        aria-label={t('filter.label')}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(SuperAdminOrgsControllerGetAllOrgsStatus).map(
          (value) => (
            <SelectItem
              key={value}
              value={value}
              data-testid={`org-filter-${value}`}
            >
              {t(`filter.${value}`)}
            </SelectItem>
          ),
        )}
      </SelectContent>
    </Select>
  );
}
