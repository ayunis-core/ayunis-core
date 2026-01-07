import SuperAdminSettingsLayout from '../../super-admin-settings-layout';
import CreateOrgDialog from './CreateOrgDialog';
import OrgsTable from './OrgsTable';
import OrgsPagination from './OrgsPagination';
import OrgsSearch from './OrgsSearch';
import type { SuperAdminOrgResponseDto, PaginationDto } from '@/shared/api';

interface SuperAdminOrgsPageProps {
  orgs: SuperAdminOrgResponseDto[];
  pagination?: PaginationDto;
  search?: string;
  currentPage: number;
}

export default function SuperAdminOrgsPage({
  orgs,
  pagination,
  search,
  currentPage,
}: SuperAdminOrgsPageProps) {
  const total = pagination?.total ?? 0;
  const limit = pagination?.limit ?? 25;
  const totalPages = Math.ceil(total / limit);

  return (
    <SuperAdminSettingsLayout action={<CreateOrgDialog />}>
      <div className="space-y-4">
        <OrgsTable orgs={orgs} searchSlot={<OrgsSearch search={search} />} />
        <OrgsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          search={search}
        />
      </div>
    </SuperAdminSettingsLayout>
  );
}
