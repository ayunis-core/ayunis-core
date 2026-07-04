import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/shared/ui/shadcn/input-otp';

interface Props {
  qrCodeDataUri: string;
  secret: string;
  onConfirm: (code: string) => void;
  isConfirming: boolean;
  errorMessage?: string | null;
}

/**
 * Scan-QR + confirm-code step of TOTP enrollment. Purely presentational —
 * the caller owns the setup/confirm mutations.
 */
export function MfaEnrollmentPanel({
  qrCodeDataUri,
  secret,
  onConfirm,
  isConfirming,
  errorMessage,
}: Readonly<Props>) {
  const { t } = useTranslation('common');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleCopySecret() {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canSubmit = code.length === 6 && !isConfirming;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t('mfa.enroll.scanInstruction')}
      </p>
      <div className="flex justify-center">
        <img
          src={qrCodeDataUri}
          alt={t('mfa.enroll.qrAlt')}
          className="h-44 w-44 rounded-md border"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="mfa-secret">{t('mfa.enroll.manualEntry')}</Label>
        <div className="flex gap-2">
          <Input
            id="mfa-secret"
            readOnly
            value={secret}
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void handleCopySecret()}
            aria-label={t('mfa.enroll.copySecret')}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t('mfa.enroll.codeLabel')}</Label>
        <InputOTP maxLength={6} value={code} onChange={setCode}>
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot key={index} index={index} />
            ))}
          </InputOTPGroup>
        </InputOTP>
        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
      </div>
      <Button
        type="button"
        className="w-full"
        disabled={!canSubmit}
        onClick={() => onConfirm(code)}
      >
        {isConfirming ? t('mfa.enroll.confirming') : t('mfa.enroll.confirm')}
      </Button>
    </div>
  );
}
