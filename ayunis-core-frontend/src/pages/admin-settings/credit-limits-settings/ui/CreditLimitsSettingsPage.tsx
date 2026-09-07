import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Tabs, TabsList, TabsTrigger } from '@ayunis/ui/components/tabs';
import { Input } from '@ayunis/ui/components/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { PaginationWidget } from '@/widgets/pagination';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import { CreditLimitBudget } from '@/widgets/credit-limit-context/ui/CreditLimitBudget';
import { CreditLimitState } from '@/widgets/credit-limit-context/ui/CreditLimitState';
import { useCreditLimitBudget } from '@/features/credit-limits/api/useCreditLimitQueries';
import {
  CREDIT_LIMIT_PAGE_SIZE,
  type CreditLimitSearch,
} from '@/features/credit-limits/model/credit-limit-settings';
import { useCreditLimitDirectory } from '@/pages/admin-settings/credit-limits-settings/api/useCreditLimitDirectory';
import { CreditLimitsTable } from './CreditLimitsTable';

export default function CreditLimitsSettingsPage({
  filters,
}: Readonly<{ filters: CreditLimitSearch }>) {
  const { t } = useTranslation('admin-settings-credit-limits');
  const budget = useCreditLimitBudget();
  return (
    <SettingsLayout title={t('page.title')}>
      <div className="space-y-6" data-testid="credit-limits-page">
        <CreditLimitBudget />
        <CreditLimitState
          isPending={budget.isPending}
          isError={budget.isError}
          unavailable={!budget.hasBudget}
          onRetry={() => void budget.refetch()}
        >
          {budget.hasBudget && <CreditLimitDirectory filters={filters} />}
        </CreditLimitState>
      </div>
    </SettingsLayout>
  );
}

function CreditLimitDirectory({
  filters,
}: Readonly<{ filters: CreditLimitSearch }>) {
  const { t } = useTranslation('admin-settings-credit-limits');
  const navigate = useNavigate();
  const directory = useCreditLimitDirectory(filters, true);
  const update = (next: Partial<CreditLimitSearch>, replace = false) =>
    void navigate({
      to: '/admin-settings/credit-limits',
      search: { ...filters, ...next },
      replace,
    });
  return (
    <div className="space-y-4">
      <Tabs
        value={filters.tab}
        onValueChange={(tab) =>
          update({
            tab: tab === 'users' ? 'users' : 'teams',
            search: undefined,
            page: 1,
          })
        }
      >
        <TabsList>
          <TabsTrigger value="teams" data-testid="credit-limits-teams-tab">
            {t('tabs.teams')}
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="credit-limits-users-tab">
            {t('tabs.users')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Card>
        <CardHeader>
          <CardTitle>{t(`table.${filters.tab}Title`)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={filters.search ?? ''}
            onChange={(event) =>
              update({ search: event.target.value || undefined, page: 1 }, true)
            }
            placeholder={t('table.search')}
            aria-label={t('table.search')}
            data-testid="credit-limits-search"
            className="max-w-sm"
          />
          <CreditLimitsTable
            rows={directory.rows}
            filters={filters}
            isPending={directory.isPending}
            isError={directory.isError}
            onRetry={directory.retry}
          />
          {!directory.isPending && !directory.isError && (
            <PaginationWidget
              currentPage={filters.page}
              totalPages={Math.ceil(directory.total / CREDIT_LIMIT_PAGE_SIZE)}
              to="/admin-settings/credit-limits"
              buildSearchParams={(page) => ({ ...filters, page })}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
