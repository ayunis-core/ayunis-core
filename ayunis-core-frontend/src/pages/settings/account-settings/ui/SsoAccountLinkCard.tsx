import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Button } from '@ayunis/ui/components/button';
import { Badge } from '@ayunis/ui/components/badge';
import { useTranslation } from 'react-i18next';
import { SettingsFieldRow } from '@/pages/settings/settings-layout/ui/SettingsFieldRow';
import { useSsoAccountLinkStatus } from '@/pages/settings/account-settings/api/useSsoAccountLinkStatus';
import { useStartSsoAccountLink } from '@/pages/settings/account-settings/api/useStartSsoAccountLink';

export function SsoAccountLinkCard() {
  const { t } = useTranslation('settings');
  const { data, isPending, isError } = useSsoAccountLinkStatus();
  const connect = useStartSsoAccountLink();
  if (isPending || isError || (!data.canLink && !data.isLinked)) return null;

  return (
    <Card data-testid="account-sso-card">
      <CardHeader>
        <CardTitle>{t('account.sso.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <SettingsFieldRow>
          <p className="min-w-0 text-sm text-muted-foreground">
            {t(
              data.isLinked
                ? 'account.sso.connectedDescription'
                : 'account.sso.description',
            )}
          </p>
          {data.isLinked ? (
            <Badge variant="secondary" data-testid="account-sso-connected">
              {t('account.sso.connected')}
            </Badge>
          ) : (
            <Button
              className="w-full shrink-0 sm:w-auto"
              variant="outline"
              data-testid="account-sso-connect"
              disabled={connect.isPending}
              onClick={() => connect.mutate()}
            >
              {t(
                connect.isPending
                  ? 'account.sso.connecting'
                  : 'account.sso.connect',
              )}
            </Button>
          )}
        </SettingsFieldRow>
      </CardContent>
    </Card>
  );
}
