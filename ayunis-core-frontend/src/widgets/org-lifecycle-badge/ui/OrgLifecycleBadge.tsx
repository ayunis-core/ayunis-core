import { Badge } from '@ayunis/ui/components/badge';
import { useTranslation } from 'react-i18next';
import type { OrgLifecycleStatus } from '@/shared/api';

const VARIANT: Record<
  OrgLifecycleStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  paying: 'default',
  expired: 'destructive',
  trial: 'outline',
  'no-plan': 'outline',
  archived: 'secondary',
};

export default function OrgLifecycleBadge({
  status,
  testId = 'org-lifecycle-badge',
}: Readonly<{ status: OrgLifecycleStatus; testId?: string }>) {
  const { t } = useTranslation('super-admin-settings-orgs');
  return (
    <Badge variant={VARIANT[status]} data-testid={testId} data-status={status}>
      {t(`lifecycle.${status}`)}
    </Badge>
  );
}
