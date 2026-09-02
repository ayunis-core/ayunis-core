import type { SuperAdminOrgResponseDto } from '@/shared/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { useTranslation } from 'react-i18next';
import OrgNameItem from '@/pages/super-admin-settings/org/ui/OrgNameItem';

interface OrgDetailsProps {
  org: SuperAdminOrgResponseDto;
}

export default function OrgDetails({ org }: Readonly<OrgDetailsProps>) {
  const { t } = useTranslation('super-admin-settings-org');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{org.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <ItemGroup>
          <OrgNameItem org={org} />
          <ItemSeparator />
          <Item>
            <ItemContent>
              <ItemTitle>{t('orgDetails.id')}</ItemTitle>
              <ItemDescription>{org.id}</ItemDescription>
            </ItemContent>
          </Item>
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
