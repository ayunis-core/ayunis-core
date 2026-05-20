import { useState } from 'react';
import type {
  SubscriptionResponseDto,
  SuperAdminTrialResponseDto,
} from '@/shared/api';
import { BrandingForm } from '@/widgets/branding-form';
import { useOrgBranding, useUpdateOrgBranding } from '@/widgets/branding-form';
import { useSuperAdminUsageStats } from '../api/useSuperAdminUsageStats';
import OrgOverviewSection from './OrgOverviewSection';

interface OrgGeneralTabProps {
  orgId: string;
  subscription: SubscriptionResponseDto | null;
  trial: SuperAdminTrialResponseDto | null;
}

export default function OrgGeneralTab({
  orgId,
  subscription,
  trial,
}: Readonly<OrgGeneralTabProps>) {
  const { branding, isLoading } = useOrgBranding(orgId);
  const [saveKey, setSaveKey] = useState(0);
  const { updateBranding, isUpdating } = useUpdateOrgBranding({
    orgId,
    onSuccess: () => setSaveKey((k) => k + 1),
  });
  const { data: usageStats, isLoading: usageStatsLoading } =
    useSuperAdminUsageStats(orgId);

  return (
    <div className="space-y-6">
      <OrgOverviewSection
        subscription={subscription}
        trial={trial}
        activeUsers={usageStats?.activeUsers}
        activeUsersLoading={usageStatsLoading}
      />
      <BrandingForm
        key={saveKey}
        branding={branding}
        isLoading={isLoading}
        isUpdating={isUpdating}
        onSubmit={updateBranding}
        orgId={orgId}
        showPreview={false}
      />
    </div>
  );
}
