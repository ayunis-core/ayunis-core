import { useMemo } from 'react';
import { UsageOverview } from '@/widgets/usage-overview';
import { createSuperAdminUsageHooks } from '../lib/createSuperAdminUsageHooks';

interface UsageTabProps {
  orgId: string;
}

export default function UsageTab({ orgId }: Readonly<UsageTabProps>) {
  // Stable per orgId so the widget and its children don't see new hook
  // references on every render (mirrors the module-constant own-org adapter).
  const hooks = useMemo(() => createSuperAdminUsageHooks(orgId), [orgId]);
  return <UsageOverview hooks={hooks} />;
}
