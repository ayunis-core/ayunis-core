import type { SuperAdminOrgOverviewResponseDto } from '@/shared/api';
import { OrgLifecycleBadge } from '@/widgets/org-lifecycle-badge';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { useTranslation } from 'react-i18next';
import { CopyButton } from '@/shared/ui/copy-button';
import UsageVisibilitySection from './UsageVisibilitySection';
import OrgLifecycleActions from './OrgLifecycleActions';
import OrgNameItem from '@/pages/super-admin-settings/org/ui/OrgNameItem';

interface OrgDetailsProps {
  org: SuperAdminOrgOverviewResponseDto;
}

export default function OrgDetails({ org }: Readonly<OrgDetailsProps>) {
  const { t } = useTranslation('super-admin-settings-org');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('orgDetails.title')}</CardTitle>
          <CardAction>
            <OrgLifecycleBadge
              status={org.lifecycleStatus}
              testId="org-status"
            />
          </CardAction>
        </CardHeader>
        <CardContent>
          <ItemGroup>
            <OrgNameItem org={org} />
            <ItemSeparator />
            <Item>
              <ItemContent>
                <ItemTitle>{t('orgDetails.id')}</ItemTitle>
                <ItemDescription>
                  <code className="rounded bg-muted px-1.5 py-0.5 break-all">
                    {org.id}
                  </code>
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <CopyButton
                  value={org.id}
                  label={t('orgDetails.id')}
                  testId="org-id-copy"
                />
              </ItemActions>
            </Item>
          </ItemGroup>
        </CardContent>
      </Card>
      <UsageVisibilitySection org={org} />
      <OrgLifecycleActions org={org} />
    </div>
  );
}
