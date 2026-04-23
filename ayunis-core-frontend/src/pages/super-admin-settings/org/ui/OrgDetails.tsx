import type { SuperAdminOrgResponseDto } from '@/shared/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { useTranslation } from 'react-i18next';

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
          <Item>
            <ItemContent>
              <ItemTitle>{t('orgDetails.name')}</ItemTitle>
              <ItemDescription>{org.name}</ItemDescription>
            </ItemContent>
          </Item>
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
