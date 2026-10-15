import { TabsTrigger } from '@ayunis/ui/components/tabs';
import { useTranslation } from 'react-i18next';
import { RequestCountBadge } from './RequestCountBadge';

export function RequestsTabTrigger({
  count,
  testId,
}: Readonly<{ count: number; testId: string }>) {
  const { t } = useTranslation('resource-handover');
  return (
    <TabsTrigger value="requests" data-testid={testId}>
      {t('requests.tab')}
      <RequestCountBadge count={count} testId={`${testId}-count`} />
    </TabsTrigger>
  );
}
