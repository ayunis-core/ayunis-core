import OrgStatusFilter from './OrgStatusFilter';
import { useTranslation } from 'react-i18next';
import SuperAdminSettingsLayout from '@/pages/super-admin-settings/super-admin-settings-layout';
import CreateOrgDialog from './CreateOrgDialog';
import OrgsTable from './OrgsTable';
import OrgsPagination from './OrgsPagination';
import OrgsSearch from './OrgsSearch';
import type {
  SuperAdminOrgResponseDto,
  PaginationDto,
  SuperAdminOrgsControllerGetAllOrgsStatus,
} from '@/shared/api';

interface SuperAdminOrgsPageProps {
  orgs: SuperAdminOrgResponseDto[];
  pagination?: PaginationDto;
  search?: string;
  status: SuperAdminOrgsControllerGetAllOrgsStatus;
  currentPage: number;
}

export default function SuperAdminOrgsPage({
  orgs,
  pagination,
  search,
  status,
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
              <OrgStatusFilter status={status} />
            </div>
          }
        />
        <OrgsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          search={search}
          status={status}
        />
      </div>
    </SuperAdminSettingsLayout>
  );
}
