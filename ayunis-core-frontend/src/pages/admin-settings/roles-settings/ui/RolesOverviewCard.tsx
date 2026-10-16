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

const ROLE_SUMMARIES = [
  { role: 'user', scope: 'scopeOrganisation' },
  { role: 'manager', scope: 'scopeOrganisation' },
  { role: 'admin', scope: 'scopeOrganisation' },
  { role: 'teamAdmin', scope: 'scopeTeam' },
] as const;

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
          {ROLE_SUMMARIES.map(({ role, scope }, index) => (
            <Fragment key={role}>
              {index > 0 && <ItemSeparator />}
              <Item size="sm">
                <ItemContent>
                  <ItemTitle>
                    {t(`overview.names.${role}`)}
                    <Badge variant="outline">{t(`overview.${scope}`)}</Badge>
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
