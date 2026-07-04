import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/shared/ui/shadcn/input-otp';
import { useVerifyMfa } from '../api/useVerifyMfa';

export function TwoFactorVerifyForm({
  redirect,
}: Readonly<{ redirect?: string }>) {
  const { t } = useTranslation('auth');
  const { verify, isLoading, errorMessage } = useVerifyMfa({ redirect });
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [code, setCode] = useState('');

  const canSubmit = useRecoveryCode
    ? code.trim().length >= 6 && !isLoading
    : code.length === 6 && !isLoading;

  const toggleMode = () => {
    setUseRecoveryCode((current) => !current);
    setCode('');
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) verify(code);
      }}
    >
      {useRecoveryCode ? (
        <Input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('twoFactor.verify.recoveryCodePlaceholder')}
          className="font-mono"
        />
      ) : (
        <div className="flex justify-center">
          <InputOTP autoFocus maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
      )}
      {errorMessage && (
        <p className="text-center text-sm text-destructive">{errorMessage}</p>
      )}
      <Button type="submit" className="w-full" disabled={!canSubmit}>
        {isLoading
          ? t('twoFactor.verify.verifying')
          : t('twoFactor.verify.submit')}
      </Button>
      <Button
        type="button"
        variant="link"
        className="w-full"
        onClick={toggleMode}
      >
        {useRecoveryCode
          ? t('twoFactor.verify.useAuthenticator')
          : t('twoFactor.verify.useRecoveryCode')}
      </Button>
    </form>
  );
}
