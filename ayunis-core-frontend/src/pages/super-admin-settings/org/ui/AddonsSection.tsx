import { useIsFeatureEnabled } from '@/features/feature-toggles';
import ExternalSubscriptionNotice from './ExternalSubscriptionNotice';
import { useTranslation } from 'react-i18next';
import { GraduationCapIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { Switch } from '@ayunis/ui/components/switch';
import { Label } from '@ayunis/ui/components/label';
import type { AddonType } from '@/shared/api';
import { useSuperAdminAddons } from '@/pages/super-admin-settings/org/api/useSuperAdminAddons';
import { useSuperAdminActivateAddon } from '@/pages/super-admin-settings/org/api/useSuperAdminActivateAddon';
import { useSuperAdminDeactivateAddon } from '@/pages/super-admin-settings/org/api/useSuperAdminDeactivateAddon';

const ADDON_ICONS: Record<AddonType, typeof GraduationCapIcon> = {
  ayunis_core_academy: GraduationCapIcon,
};

interface AddonsSectionProps {
  orgId: string;
}

export default function AddonsSection({ orgId }: Readonly<AddonsSectionProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const readOnly = useIsFeatureEnabled('externalSubscriptionsEnabled');
  const { addons, isLoading, isError } = useSuperAdminAddons(orgId);
  const { activateAddon, isLoading: isActivating } =
    useSuperAdminActivateAddon(orgId);
  const { deactivateAddon, isLoading: isDeactivating } =
    useSuperAdminDeactivateAddon(orgId);

  function renderContent() {
    if (isLoading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
        </div>
      );
    }
    if (isError) {
      return <p className="text-destructive text-sm">{t('addons.error')}</p>;
    }
    return (
      <div className="space-y-4">
        {addons.map((addon) => {
          const Icon = ADDON_ICONS[addon.type];
          return (
            <div
              key={addon.type}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-start gap-3">
                <Icon className="text-muted-foreground mt-1 h-5 w-5" />
                <div className="space-y-1">
                  <Label htmlFor={`addon-${addon.type}`}>
                    {t(`addons.items.${addon.type}.title`)}
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    {t(`addons.items.${addon.type}.description`)}
                  </p>
                </div>
              </div>
              <Switch
                id={`addon-${addon.type}`}
                checked={addon.active}
                disabled={isActivating || isDeactivating || readOnly}
                data-testid={`addon-${addon.type}-toggle`}
                onCheckedChange={(checked) =>
                  checked
                    ? activateAddon(addon.type)
                    : deactivateAddon(addon.type)
                }
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('addons.title')}</CardTitle>
        <CardDescription>{t('addons.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {readOnly && <ExternalSubscriptionNotice />}
        {renderContent()}
      </CardContent>
    </Card>
  );
}
