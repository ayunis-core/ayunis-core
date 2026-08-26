import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import {
  resolveCertificateExpiryNotice,
  useAcademyAccessStatus,
  useAcademyProgress,
  useIsAcademyAddonActive,
} from '@/features/academy';
import { AcademyAccessMode } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { formatDate } from '@/shared/lib/format-date';

/**
 * When the user last completed the KI-Schulung nach EU AI Act and — for orgs
 * on annual renewal — when it has to be completed again. Renders nothing
 * without the academy add-on because there is no training status to show.
 */
export function AcademyCertificateCard() {
  const { t } = useTranslation('academy');
  const addonActive = useIsAcademyAddonActive();
  // Progress is add-on gated server-side, so asking for it without the add-on
  // would 403 on every visit to account settings.
  const { progress, isLoading: isProgressLoading } =
    useAcademyProgress(addonActive);
  const { status, isLoading: isStatusLoading } = useAcademyAccessStatus();
  const isLoading = isProgressLoading || isStatusLoading;
  // The badge states are mutually exclusive, so anything short of both answers
  // makes it assert something false: "not passed" while progress is in flight,
  // or "valid" for a lapsed certificate whenever the status request is missing.
  // Absent status is not the same as an unrestricted org, so say nothing.
  const canJudgeStatus = !isLoading && status !== undefined;

  if (!addonActive) {
    return null;
  }

  const lastPassedAt = progress?.academyCompletedAt ?? null;
  // Expiry only means something where the org actually requires renewal;
  // showing it elsewhere would imply a deadline that mode does not have.
  const renewalRequired = status?.mode === AcademyAccessMode.required_annually;
  const nextRenewalAt = renewalRequired
    ? (progress?.academyCompletionExpiresAt ?? null)
    : null;
  // In annual mode `allowed` is precisely "holds a non-expired certificate", so
  // lean on the server's verdict instead of racing the client clock.
  const expired = renewalRequired && lastPassedAt !== null && !status.allowed;
  // Same 30-day window the admin overview flags, so both sides of the org read
  // the same state for the same member.
  const expiringSoon =
    !expired &&
    resolveCertificateExpiryNotice(
      nextRenewalAt === null ? null : new Date(nextRenewalAt),
      new Date(),
    ).level !== 'none';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('account.title')}
          {canJudgeStatus && (
            <CertificateBadge
              hasPassed={lastPassedAt !== null}
              expired={expired}
              expiringSoon={expiringSoon}
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-5 w-2/3" />}
        {!isLoading && (
          <div className="flex items-center justify-between gap-4">
            {lastPassedAt === null ? (
              <div className="text-sm text-muted-foreground">
                {t('account.notPassedDescription')}
              </div>
            ) : (
              <dl className="space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">
                    {t('account.lastPassed')}
                  </dt>
                  <dd className="font-medium">{formatDate(lastPassedAt)}</dd>
                </div>
                {nextRenewalAt !== null && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">
                      {expired
                        ? t('account.expiredOn')
                        : t('account.nextRenewal')}
                    </dt>
                    <dd className="font-medium">{formatDate(nextRenewalAt)}</dd>
                  </div>
                )}
              </dl>
            )}
            <Button variant="outline" asChild>
              <Link to="/academy">{t('account.action')}</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CertificateBadge({
  hasPassed,
  expired,
  expiringSoon,
}: Readonly<{
  hasPassed: boolean;
  expired: boolean;
  expiringSoon: boolean;
}>) {
  const { t } = useTranslation('academy');

  if (!hasPassed) {
    return <Badge variant="outline">{t('account.status.notPassed')}</Badge>;
  }
  if (expired) {
    return <Badge variant="destructive">{t('account.status.expired')}</Badge>;
  }
  if (expiringSoon) {
    return <Badge variant="outline">{t('account.status.expiringSoon')}</Badge>;
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <CheckCircle2 className="h-3 w-3" />
      {t('account.status.valid')}
    </Badge>
  );
}
