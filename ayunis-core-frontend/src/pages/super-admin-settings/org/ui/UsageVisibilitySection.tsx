import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import type { SuperAdminOrgResponseDto } from '@/shared/api';
import UsageVisibilityItem from './UsageVisibilityItem';

export default function UsageVisibilitySection({
  org,
}: Readonly<{ org: SuperAdminOrgResponseDto }>) {
  const { t } = useTranslation('super-admin-settings-org');
  return (
    <Card data-testid="org-usage-data-section">
      <CardHeader>
        <CardTitle>{t('usageVisibility.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <UsageVisibilityItem org={org} />
      </CardContent>
    </Card>
  );
}
