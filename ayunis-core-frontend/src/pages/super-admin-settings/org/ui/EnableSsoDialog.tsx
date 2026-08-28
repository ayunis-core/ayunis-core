import type { useSetSuperAdminSsoEnabled } from '@/pages/super-admin-settings/org/api/useSetSuperAdminSsoEnabled';
import type { OrgSsoConnectionResponseDto } from '@/shared/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@ayunis/ui/components/alert-dialog';
import { Button } from '@ayunis/ui/components/button';
import { Checkbox } from '@ayunis/ui/components/checkbox';
import { Label } from '@ayunis/ui/components/label';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface EnableSsoDialogProps {
  orgId: string;
  connection: OrgSsoConnectionResponseDto;
  // Owned by the parent so its busy state also covers an in-flight enable.
  mutation: ReturnType<typeof useSetSuperAdminSsoEnabled>;
  disabled?: boolean;
}

export default function EnableSsoDialog({
  orgId,
  connection,
  mutation,
  disabled = false,
}: Readonly<EnableSsoDialogProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const [reviewed, setReviewed] = useState(false);

  function enable() {
    mutation.mutate({
      orgId,
      data: {
        enabled: true,
        confirmed: true,
        reviewedEmailDomains: connection.emailDomains.map(
          ({ emailDomain }) => emailDomain,
        ),
        reviewedZitadelOrgId: connection.zitadelOrgId ?? undefined,
      },
    });
  }

  return (
    <AlertDialog onOpenChange={(open) => !open && setReviewed(false)}>
      <AlertDialogTrigger asChild>
        <Button data-testid="sso-enable" disabled={disabled}>
          {t('sso.enable.button')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('sso.enable.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('sso.enable.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <dl className="grid gap-3 rounded-lg border p-4 text-sm">
          <div>
            <dt className="text-muted-foreground">{t('sso.emailDomains')}</dt>
            <dd>
              <ul className="list-inside list-disc font-medium">
                {connection.emailDomains.map(({ emailDomain }) => (
                  <li key={emailDomain}>{emailDomain}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('sso.zitadelOrgId')}</dt>
            <dd className="font-mono text-xs">{connection.zitadelOrgId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {t('sso.idp.zitadelIdpId')}
            </dt>
            <dd
              className="font-mono text-xs"
              data-testid="sso-reviewed-zitadel-idp-id"
            >
              {connection.zitadelIdpId ?? t('sso.idp.notConfigured')}
            </dd>
          </div>
        </dl>
        <div className="flex items-start gap-2">
          <Checkbox
            data-testid="sso-enable-reviewed"
            id="confirm-sso-mapping"
            checked={reviewed}
            onCheckedChange={(value) => setReviewed(value === true)}
          />
          <Label htmlFor="confirm-sso-mapping" className="font-normal">
            {t('sso.enable.confirm')}
          </Label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('sso.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            data-testid="sso-enable-confirm"
            disabled={!reviewed || mutation.isPending}
            onClick={enable}
          >
            {t('sso.enable.confirmButton')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
