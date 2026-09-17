import SuperAdminSettingsLayout from '@/pages/super-admin-settings/super-admin-settings-layout';
import type {
  SuperAdminOrgResponseDto,
  SubscriptionResponseDto,
  UserResponseDto,
  SuperAdminTrialResponseDto,
  PaginationDto,
} from '@/shared/api';
import UsersTable from './UsersTable';
import OrgDetails from './OrgDetails';
import ModelsSection from './ModelsSection';
import CrawlDomainsSection from './CrawlDomainsSection';
import AddonsSection from './AddonsSection';
import TrialSection from './TrialSection';
import NoTrialSection from './NoTrialSection';
import UsageTab from './UsageTab';
import SsoSection from './SsoSection';
import SubscriptionsTab from './SubscriptionsTab';
import type { SubscriptionHistoryItem } from '@/pages/super-admin-settings/org/model/types';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@ayunis/ui/components/tabs';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useCallback } from 'react';

interface SuperAdminSettingsOrgPageProps {
  org: SuperAdminOrgResponseDto;
  users: UserResponseDto[];
  usersPagination?: PaginationDto;
  usersSearch?: string;
  usersCurrentPage: number;
  subscription: SubscriptionResponseDto | null;
  subscriptionHistory?: SubscriptionHistoryItem[];
  activeSubscriptionCount?: number;
  trial: SuperAdminTrialResponseDto | null;
  initialTab?:
    | 'org'
    | 'users'
    | 'subscriptions'
    | 'models'
    | 'trials'
    | 'usage'
    | 'crawl-domains'
    | 'addons'
    | 'sso';
}
export default function SuperAdminSettingsOrgPage({
  org,
  users,
  usersPagination,
  usersSearch,
  usersCurrentPage,
  subscription,
  subscriptionHistory = [],
  activeSubscriptionCount = 0,
  trial,
  initialTab = 'org',
}: Readonly<SuperAdminSettingsOrgPageProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const { t: tLayout } = useTranslation('super-admin-settings-layout');
  const navigate = useNavigate();
  const { id } = useParams({
    from: '/_authenticated/super-admin-settings/orgs/$id',
  });

  const handleTabChange = useCallback(
    (value: string) => {
      void navigate({
        to: '/super-admin-settings/orgs/$id',
        params: { id },
        search: {
          tab: value as
            | 'org'
            | 'users'
            | 'subscriptions'
            | 'models'
            | 'trials'
            | 'usage'
            | 'crawl-domains'
            | 'addons'
            | 'sso',
        },
      });
    },
    [navigate, id],
  );

  return (
    <SuperAdminSettingsLayout
      breadcrumbs={[
        { label: tLayout('layout.orgs'), href: '/super-admin-settings/orgs' },
        { label: org.name },
      ]}
    >
      <Tabs
        value={initialTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="org">{t('tabs.org')}</TabsTrigger>
            <TabsTrigger value="users">{t('tabs.users')}</TabsTrigger>
            <TabsTrigger
              value="subscriptions"
              data-testid="org-subscriptions-tab"
            >
              {t('tabs.subscriptions')}
            </TabsTrigger>
            <TabsTrigger value="trials">{t('tabs.trials')}</TabsTrigger>
            <TabsTrigger value="models">{t('tabs.models')}</TabsTrigger>
            <TabsTrigger value="crawl-domains">
              {t('tabs.crawlDomains')}
            </TabsTrigger>
            <TabsTrigger value="addons">{t('tabs.addons')}</TabsTrigger>
            <TabsTrigger value="usage">{t('tabs.usage')}</TabsTrigger>
            <TabsTrigger value="sso">{t('tabs.sso')}</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="org" className="mt-4">
          <OrgDetails org={org} />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTable
            users={users}
            orgId={org.id}
            pagination={usersPagination}
            search={usersSearch}
            currentPage={usersCurrentPage}
          />
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-4">
          <SubscriptionsTab
            orgId={org.id}
            subscription={subscription}
            subscriptionHistory={subscriptionHistory}
            activeSubscriptionCount={activeSubscriptionCount}
          />
        </TabsContent>
        <TabsContent value="trials" className="mt-4">
          {trial ? (
            <TrialSection trial={trial} orgId={org.id} />
          ) : (
            <NoTrialSection orgId={org.id} />
          )}
        </TabsContent>
        <TabsContent value="models" className="mt-4">
          <ModelsSection orgId={org.id} />
        </TabsContent>
        <TabsContent value="crawl-domains" className="mt-4">
          <CrawlDomainsSection orgId={org.id} />
        </TabsContent>
        <TabsContent value="addons" className="mt-4">
          <AddonsSection orgId={org.id} />
        </TabsContent>
        <TabsContent value="usage" className="mt-4">
          <UsageTab orgId={org.id} />
        </TabsContent>
        <TabsContent value="sso" className="mt-4">
          <SsoSection orgId={org.id} />
        </TabsContent>
      </Tabs>
    </SuperAdminSettingsLayout>
  );
}
