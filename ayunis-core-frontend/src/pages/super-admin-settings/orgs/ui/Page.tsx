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
  OrgsSortField,
} from '@/shared/api';
import type { TableSort } from '@/shared/lib/table-sort';
import { useNavigate } from '@tanstack/react-router';

interface SuperAdminOrgsPageProps {
  orgs: SuperAdminOrgOverviewResponseDto[];
  pagination?: PaginationDto;
  lifecycleCounts?: OrgLifecycleCountsDto;
  search?: string;
  lifecycle: OrgLifecycleFilterValue;
  currentPage: number;
  sort: TableSort<OrgsSortField>;
}

export default function SuperAdminOrgsPage({
  orgs,
  pagination,
  lifecycleCounts,
  search,
  lifecycle,
  currentPage,
  sort,
}: Readonly<SuperAdminOrgsPageProps>) {
  const { t } = useTranslation('super-admin-settings-layout');
  const navigate = useNavigate({ from: '/super-admin-settings/orgs/' });
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
          sort={sort}
          onSort={(next) =>
            void navigate({
              search: (previous) => ({ ...previous, ...next, page: undefined }),
            })
          }
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
          sort={sort}
        />
      </div>
    </SuperAdminSettingsLayout>
  );
}
