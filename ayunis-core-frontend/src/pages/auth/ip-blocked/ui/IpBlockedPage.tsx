import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';

export function IpBlockedPage() {
  const { t } = useTranslation('auth');

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <ShieldAlert className="h-16 w-16 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">{t('ipBlocked.title')}</h1>
        <p className="text-muted-foreground">{t('ipBlocked.description')}</p>
        <Button asChild variant="outline">
          <Link to="/login">{t('ipBlocked.backToLogin')}</Link>
        </Button>
      </div>
    </div>
  );
}
