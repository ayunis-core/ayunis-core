import { useTranslation } from 'react-i18next';
import { Switch } from '@ayunis/ui/components/switch';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from '@ayunis/ui/components/item';
import type { SuperAdminOrgResponseDto } from '@/shared/api';
import { useSetOrgUsageVisibility } from '@/pages/super-admin-settings/org/api/useSetOrgUsageVisibility';

export default function UsageVisibilityItem({
  org,
}: Readonly<{ org: SuperAdminOrgResponseDto }>) {
  const { t } = useTranslation('super-admin-settings-org');
  const mutation = useSetOrgUsageVisibility();
  return (
    <Item>
      <ItemContent>
        <ItemTitle>
          <label htmlFor="org-hide-individual-usage">
            {t('usageVisibility.label')}
          </label>
        </ItemTitle>
        <p
          id="org-usage-visibility-description"
          className="text-muted-foreground text-sm"
        >
          {t('usageVisibility.description')}
        </p>
      </ItemContent>
      <ItemActions>
        <Switch
          aria-describedby="org-usage-visibility-description"
          id="org-hide-individual-usage"
          data-testid="org-hide-individual-usage"
          checked={org.hideIndividualUsage}
          disabled={mutation.isPending}
          onCheckedChange={(hideIndividualUsage) =>
            mutation.mutate({ id: org.id, data: { hideIndividualUsage } })
          }
        />
      </ItemActions>
    </Item>
  );
}
