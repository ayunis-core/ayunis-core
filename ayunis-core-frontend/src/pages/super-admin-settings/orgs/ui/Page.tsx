import OrgLifecycleFilter from './OrgLifecycleFilter';
import OrgLifecycleSummary from './OrgLifecycleSummary';
import { useTranslation } from 'react-i18next';
import SuperAdminSettingsLayout from '@/pages/super-admin-settings/super-admin-settings-layout';
import CreateOrgDialog from './CreateOrgDialog';
import OrgsTable from './OrgsTable';
import OrgsPagination from './OrgsPagination';
import OrgsSearch from './OrgsSearch';
import type {
  SuperAdminOrgOverviewResponseDto,
  PaginationDto,
  OrgLifecycleCountsDto,
  OrgLifecycleFilter as OrgLifecycleFilterValue,
} from '@/shared/api';

interface SuperAdminOrgsPageProps {
  orgs: SuperAdminOrgOverviewResponseDto[];
  pagination?: PaginationDto;
  lifecycleCounts?: OrgLifecycleCountsDto;
  search?: string;
  lifecycle: OrgLifecycleFilterValue;
  currentPage: number;
}

export default function SuperAdminOrgsPage({
  orgs,
  pagination,
  lifecycleCounts,
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
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <OrgsSearch search={search} />
                <OrgLifecycleFilter lifecycle={lifecycle} />
              </div>
              {lifecycleCounts && (
                <OrgLifecycleSummary counts={lifecycleCounts} />
              )}
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
