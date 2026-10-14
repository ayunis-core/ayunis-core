import type { SuperAdminOrgResponseDto } from '@/shared/api';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';
import UsageVisibilitySection from './UsageVisibilitySection';
import OrgLifecycleActions from './OrgLifecycleActions';
import OrgNameItem from '@/pages/super-admin-settings/org/ui/OrgNameItem';

interface OrgDetailsProps {
  org: SuperAdminOrgResponseDto;
}

export default function OrgDetails({ org }: Readonly<OrgDetailsProps>) {
  const { t } = useTranslation('super-admin-settings-org');

  async function copyId() {
    try {
      await navigator.clipboard.writeText(org.id);
      showSuccess(t('orgDetails.copyIdSuccess'));
    } catch {
      showError(t('orgDetails.copyIdError'));
    }
  }

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
                  <code className="rounded bg-muted px-1.5 py-0.5 break-all">
                    {org.id}
                  </code>
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('orgDetails.copyId')}
                  title={t('orgDetails.copyId')}
                  onClick={() => void copyId()}
                  data-testid="org-id-copy"
                >
                  <Copy />
                </Button>
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
