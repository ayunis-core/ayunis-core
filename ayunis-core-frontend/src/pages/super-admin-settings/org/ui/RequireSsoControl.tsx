import type { useSetSuperAdminLocalPasswordLogin } from '@/pages/super-admin-settings/org/api/useSetSuperAdminLocalPasswordLogin';
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
} from '@ayunis/ui/components/alert-dialog';
import { Checkbox } from '@ayunis/ui/components/checkbox';
import { Label } from '@ayunis/ui/components/label';
import { Switch } from '@ayunis/ui/components/switch';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface RequireSsoControlProps {
  orgId: string;
  connection: OrgSsoConnectionResponseDto;
  mutation: ReturnType<typeof useSetSuperAdminLocalPasswordLogin>;
  disabled: boolean;
}

export default function RequireSsoControl({
  orgId,
  connection,
  mutation,
  disabled,
}: Readonly<RequireSsoControlProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const [open, setOpen] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const ssoRequired = !connection.localPasswordLoginEnabled;

  function changeRequirement(required: boolean) {
    if (required) {
      setOpen(true);
      return;
    }
    mutation.mutate({ orgId, data: { enabled: true } });
  }

  function requireSso() {
    if (!connection.zitadelOrgId) return;
    mutation.mutate({
      orgId,
      data: {
        enabled: false,
        confirmed: true,
        reviewedEmailDomains: connection.emailDomains.map(
          ({ emailDomain }) => emailDomain,
        ),
        reviewedZitadelOrgId: connection.zitadelOrgId,
        reviewedZitadelIdpId: connection.zitadelIdpId,
      },
    });
    setOpen(false);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="sso-required">
            {t('sso.passwordLogin.requireSsoLabel')}
          </Label>
          <p className="text-muted-foreground text-sm">
            {t('sso.passwordLogin.requireSsoDescription')}
          </p>
        </div>
        <Switch
          id="sso-required"
          data-testid="sso-required"
          checked={ssoRequired}
          disabled={disabled || !connection.enabled}
          onCheckedChange={changeRequirement}
        />
      </div>
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setReviewed(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('sso.passwordLogin.confirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('sso.passwordLogin.confirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="list-inside list-disc space-y-2 text-sm">
            <li>{t('sso.passwordLogin.passwordImpact')}</li>
            <li>{t('sso.passwordLogin.sessionImpact')}</li>
            <li>{t('sso.passwordLogin.domainImpact')}</li>
          </ul>
          <div className="rounded-lg border p-4 text-sm">
            <p className="text-muted-foreground">{t('sso.emailDomains')}</p>
            <ul className="list-inside list-disc font-medium">
              {connection.emailDomains.map(({ emailDomain }) => (
                <li key={emailDomain}>{emailDomain}</li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-3">
              {t('sso.idp.zitadelIdpId')}
            </p>
            <p className="font-mono text-xs">
              {connection.zitadelIdpId ?? t('sso.idp.notConfigured')}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="confirm-sso-only"
              data-testid="sso-required-reviewed"
              checked={reviewed}
              onCheckedChange={(value) => setReviewed(value === true)}
            />
            <Label htmlFor="confirm-sso-only" className="font-normal">
              {t('sso.passwordLogin.confirm')}
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('sso.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="sso-required-confirm"
              disabled={!reviewed || mutation.isPending}
              onClick={requireSso}
            >
              {t('sso.passwordLogin.confirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
