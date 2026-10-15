import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Card,
  CardContent,
  CardDescription,
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
import { ROLE_COLUMNS } from '@/pages/admin-settings/roles-settings/model/types';

export function RolesOverviewCard() {
  const { t } = useTranslation('admin-settings-roles');

  return (
    <Card data-testid="roles-overview">
      <CardHeader>
        <CardTitle>{t('overview.title')}</CardTitle>
        <CardDescription>{t('overview.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ItemGroup>
          {ROLE_COLUMNS.map((role, index) => (
            <Fragment key={role}>
              {index > 0 && <ItemSeparator />}
              <Item size="sm">
                <ItemContent>
                  <ItemTitle>
                    {t(`columns.${role}`)}
                    <Badge variant="outline">
                      {t('overview.scopeOrganisation')}
                    </Badge>
                  </ItemTitle>
                  <ItemDescription className="line-clamp-none">
                    {t(`overview.roles.${role}`)}
                  </ItemDescription>
                </ItemContent>
              </Item>
            </Fragment>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
