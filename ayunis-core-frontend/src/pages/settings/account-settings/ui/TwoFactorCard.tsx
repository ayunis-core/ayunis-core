import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/shadcn/button';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/shadcn/dialog';
import { Input } from '@/shared/ui/shadcn/input';
import {
  MfaEnrollmentPanel,
  RecoveryCodesPanel,
} from '@/widgets/mfa-enrollment';
import { useMfa } from '../api/useMfa';

export function TwoFactorCard() {
  const { t } = useTranslation('settings');
  const mfa = useMfa();
  const [enableOpen, setEnableOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  const enabled = mfa.status?.enabled ?? false;

  const openEnable = () => {
    mfa.resetEnrollmentState();
    mfa.startSetup();
    setEnableOpen(true);
  };

  const closeEnable = () => {
    setEnableOpen(false);
    mfa.resetEnrollmentState();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('account.mfa.title')}
          {enabled && (
            <Badge variant="secondary">{t('account.mfa.enabledBadge')}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mfa.isLoadingStatus && (
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-9 w-24" />
          </div>
        )}
        {mfa.isStatusError && (
          <p className="text-sm text-destructive">
            {t('account.mfa.error.statusFailed')}
          </p>
        )}
        {!mfa.isLoadingStatus && !mfa.isStatusError && (
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {enabled
                ? t('account.mfa.enabledDescription', {
                    count: mfa.status?.recoveryCodesRemaining ?? 0,
                  })
                : t('account.mfa.disabledDescription')}
            </div>
            {enabled ? (
              <Button variant="outline" onClick={() => setDisableOpen(true)}>
                {t('account.mfa.disableButton')}
              </Button>
            ) : (
              <Button onClick={openEnable}>
                {t('account.mfa.enableButton')}
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <Dialog
        open={enableOpen}
        onOpenChange={(open) => {
          // Block dismissal on the recovery-codes step — they are shown once.
          if (!open && mfa.recoveryCodes) return;
          if (!open) closeEnable();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('account.mfa.enableDialogTitle')}</DialogTitle>
            <DialogDescription>
              {mfa.recoveryCodes
                ? t('account.mfa.recoveryCodesDescription')
                : t('account.mfa.enableDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          {mfa.recoveryCodes ? (
            <RecoveryCodesPanel
              codes={mfa.recoveryCodes}
              continueLabel={t('account.mfa.done')}
              onContinue={closeEnable}
            />
          ) : (
            mfa.setup && (
              <MfaEnrollmentPanel
                qrCodeDataUri={mfa.setup.qrCodeDataUri}
                secret={mfa.setup.secret}
                onConfirm={mfa.confirm}
                isConfirming={mfa.isConfirming}
                errorMessage={mfa.errorMessage}
              />
            )
          )}
        </DialogContent>
      </Dialog>

      <DisableDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        onDisable={(code) => mfa.disable(code, () => setDisableOpen(false))}
        isDisabling={mfa.isDisabling}
        errorMessage={mfa.errorMessage}
      />
    </Card>
  );
}

function DisableDialog({
  open,
  onOpenChange,
  onDisable,
  isDisabling,
  errorMessage,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisable: (code: string) => void;
  isDisabling: boolean;
  errorMessage: string | null;
}>) {
  const { t } = useTranslation('settings');
  const [code, setCode] = useState('');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setCode('');
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('account.mfa.disableDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('account.mfa.disableDialogDescription')}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim().length >= 6 && !isDisabling) onDisable(code);
          }}
        >
          <Input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('account.mfa.codePlaceholder')}
            className="font-mono"
          />
          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
          <Button
            type="submit"
            variant="destructive"
            className="w-full"
            disabled={code.trim().length < 6 || isDisabling}
          >
            {isDisabling
              ? t('account.mfa.disabling')
              : t('account.mfa.disableConfirm')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
