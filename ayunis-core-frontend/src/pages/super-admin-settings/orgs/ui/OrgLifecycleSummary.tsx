import { useTranslation } from 'react-i18next';
import type { OrgLifecycleCountsDto } from '@/shared/api';

const STATUS_ORDER = [
  'paying',
  'expired',
  'trial',
  'no-plan',
  'archived',
] as const;

export default function OrgLifecycleSummary({
  counts,
}: Readonly<{ counts: OrgLifecycleCountsDto }>) {
  const { t } = useTranslation('super-admin-settings-orgs');
  const parts = [
    t('lifecycleSummary.total', { count: counts.total }),
    ...STATUS_ORDER.map((status) =>
      t(`lifecycleSummary.${status}`, { count: counts[status] }),
    ),
  ];
  return (
    <p
      className="text-sm text-muted-foreground"
      data-testid="org-lifecycle-summary"
    >
      {parts.join(' · ')}
    </p>
  );
}
