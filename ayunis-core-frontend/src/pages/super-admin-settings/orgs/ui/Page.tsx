import OrgLifecycleFilter from './OrgLifecycleFilter';
import { useTranslation } from 'react-i18next';
import SuperAdminSettingsLayout from '@/pages/super-admin-settings/super-admin-settings-layout';
import CreateOrgDialog from './CreateOrgDialog';
import OrgsTable from './OrgsTable';
import OrgsPagination from './OrgsPagination';
import OrgsSearch from './OrgsSearch';
import type {
  SuperAdminOrgListItemResponseDto,
  PaginationDto,
  OrgLifecycleFilter as OrgLifecycleFilterValue,
} from '@/shared/api';

interface SuperAdminOrgsPageProps {
  orgs: SuperAdminOrgListItemResponseDto[];
  pagination?: PaginationDto;
  search?: string;
  lifecycle: OrgLifecycleFilterValue;
  currentPage: number;
}

export default function SuperAdminOrgsPage({
  orgs,
  pagination,
  search,
  lifecycle,
  currentPage,
}: Readonly<SuperAdminOrgsPageProps>) {
  const { t } = useTranslation('super-admin-settings-layout');
  const total = pagination?.total ?? 0;
  const limit = pagination?.limit ?? 25;
  const totalPages = Math.ceil(total / limit);

  return (
    <SuperAdminSettingsLayout
      pageTitle={t('layout.orgs')}
      action={<CreateOrgDialog />}
    >
      <div className="space-y-4">
        <OrgsTable
          orgs={orgs}
          searchSlot={
            <div className="flex flex-wrap gap-2">
              <OrgsSearch search={search} />
              <OrgLifecycleFilter lifecycle={lifecycle} />
            </div>
          }
        />
        <OrgsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          search={search}
          lifecycle={lifecycle}
        />
      </div>
    </SuperAdminSettingsLayout>
  );
}
