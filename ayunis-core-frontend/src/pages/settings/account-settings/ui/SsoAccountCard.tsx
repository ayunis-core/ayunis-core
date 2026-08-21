import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { useTranslation } from 'react-i18next';
import { useStartSsoLink } from '@/features/sso';
import { useRedirectNotification } from '@/features/useRedirectNotification';

interface SsoAccountCardProps {
  linked: boolean;
}

export function SsoAccountCard({ linked }: Readonly<SsoAccountCardProps>) {
  const { t } = useTranslation('settings');
  const { startLink, isPending } = useStartSsoLink();

  useRedirectNotification({
    show: linked,
    text: t('account.sso.linkSuccess'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('account.sso.title')}</CardTitle>
        <CardDescription>{t('account.sso.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={startLink} disabled={isPending}>
          {isPending ? t('account.sso.linking') : t('account.sso.linkButton')}
        </Button>
      </CardContent>
    </Card>
  );
}
