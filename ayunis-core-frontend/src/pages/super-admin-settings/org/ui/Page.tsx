import SuperAdminSettingsLayout from '../../super-admin-settings-layout';
import type {
  SuperAdminOrgResponseDto,
  SubscriptionResponseDto,
  UserResponseDto,
  SuperAdminTrialResponseDto,
  PaginationDto,
} from '@/shared/api';
import UsersTable from './UsersTable';
import OrgDetails from './OrgDetails';
import LicenseSeatsSection from './LicenseSeatsSection';
import BillingInfoSection from './BillingInfoSection';
import SubscriptionCancellationSection from './SubscriptionCancellationSection';
import NoSubscriptionSection from './NoSubscriptionSection';
import ModelsSection from './ModelsSection';
import TrialSection from './TrialSection';
import NoTrialSection from './NoTrialSection';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/ui/shadcn/tabs';
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
  trial: SuperAdminTrialResponseDto | null;
  initialTab?: 'org' | 'users' | 'subscriptions' | 'models' | 'trials';
}
export default function SuperAdminSettingsOrgPage({
  org,
  users,
  usersPagination,
  usersSearch,
  usersCurrentPage,
  subscription,
  trial,
  initialTab = 'org',
}: SuperAdminSettingsOrgPageProps) {
  const { t } = useTranslation('super-admin-settings-org');
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
          tab: value as 'org' | 'users' | 'subscriptions' | 'models' | 'trials',
        },
      });
    },
    [navigate, id],
  );

  return (
    <SuperAdminSettingsLayout pageTitle={org.name}>
      <Tabs
        value={initialTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="org">{t('tabs.org')}</TabsTrigger>
          <TabsTrigger value="users">{t('tabs.users')}</TabsTrigger>
          <TabsTrigger value="subscriptions">
            {t('tabs.subscriptions')}
          </TabsTrigger>
          <TabsTrigger value="trials">{t('tabs.trials')}</TabsTrigger>
          <TabsTrigger value="models">{t('tabs.models')}</TabsTrigger>
        </TabsList>
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
          {subscription ? (
            <div className="space-y-4">
              <LicenseSeatsSection subscription={subscription} orgId={org.id} />
              <BillingInfoSection subscription={subscription} orgId={org.id} />
              <SubscriptionCancellationSection
                subscription={subscription}
                orgId={org.id}
              />
            </div>
          ) : (
            <NoSubscriptionSection orgId={org.id} />
          )}
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
      </Tabs>
    </SuperAdminSettingsLayout>
  );
}
