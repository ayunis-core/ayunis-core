import type { SuperAdminOrgResponseDto } from '@/shared/api';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { useTranslation } from 'react-i18next';
import OrgLifecycleActions from './OrgLifecycleActions';
import OrgNameItem from '@/pages/super-admin-settings/org/ui/OrgNameItem';

interface OrgDetailsProps {
  org: SuperAdminOrgResponseDto;
}

export default function OrgDetails({ org }: Readonly<OrgDetailsProps>) {
  const { t } = useTranslation('super-admin-settings-org');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('orgDetails.title')}</CardTitle>
          <CardAction>
            <Badge
              variant={org.archived ? 'secondary' : 'outline'}
              data-testid="org-status"
            >
              {t(org.archived ? 'lifecycle.archived' : 'lifecycle.active')}
            </Badge>
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
                  <code className="break-all">{org.id}</code>
                </ItemDescription>
              </ItemContent>
            </Item>
          </ItemGroup>
        </CardContent>
      </Card>
      <OrgLifecycleActions org={org} />
    </div>
  );
}
