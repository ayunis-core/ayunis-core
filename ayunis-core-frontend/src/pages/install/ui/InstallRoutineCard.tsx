import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { CalendarClock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { MarketplaceEntryIcon } from '@/features/marketplace';
import {
  RoutineInternetAccess,
  RoutineScheduleSummary,
} from '@/features/routines';
import type { MarketplaceRoutineResponseDto } from '@/pages/install/api/useFetchMarketplaceRoutine';

interface InstallRoutineCardProps {
  routine: MarketplaceRoutineResponseDto;
  onInstall: () => void;
  isInstalling: boolean;
}

export function InstallRoutineCard({
  routine,
  onInstall,
  isInstalling,
}: Readonly<InstallRoutineCardProps>) {
  const { t } = useTranslation('install-routine');

  return (
    <Card className="w-full max-w-lg" data-testid="install-routine-card">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <MarketplaceEntryIcon
            iconName={routine.iconName}
            fallback={CalendarClock}
            className="h-8 w-8 text-primary"
          />
        </div>
        <CardTitle className="text-xl">{routine.name}</CardTitle>
        <CardDescription>{routine.shortDescription}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">{t('detail.schedule')}</dt>
            <dd>
              <RoutineScheduleSummary schedule={routine.schedule} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('detail.internet')}</dt>
            <dd data-testid="install-routine-internet">
              {t(`detail.internetAccess.${routine.internetAccess}`)}
              {routine.internetAccess === RoutineInternetAccess.allowlist && (
                <ul className="mt-1 list-inside list-disc">
                  {routine.allowedDomains.map((domain) => (
                    <li key={domain}>{domain}</li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </dl>
        <div className="rounded-md bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            {t('detail.installNote')}
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <Link to="/routines">{t('action.cancel')}</Link>
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={isInstalling}
          data-testid="install-routine-confirm"
          onClick={onInstall}
        >
          {isInstalling ? t('action.installing') : t('action.install')}
        </Button>
      </CardFooter>
    </Card>
  );
}
