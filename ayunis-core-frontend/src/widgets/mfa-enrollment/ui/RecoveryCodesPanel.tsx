import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, Copy } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import { Button } from '@/shared/ui/shadcn/button';

interface Props {
  codes: string[];
  onContinue: () => void;
  continueLabel: string;
}

/**
 * One-time display of freshly issued MFA recovery codes. The codes are never
 * shown again, so continuing requires an explicit acknowledgement.
 */
export function RecoveryCodesPanel({
  codes,
  onContinue,
  continueLabel,
}: Readonly<Props>) {
  const { t } = useTranslation('common');
  const [copied, setCopied] = useState(false);

  async function handleCopyAll() {
    await navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{t('mfa.recoveryCodes.warning')}</AlertDescription>
      </Alert>
      <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/50 p-4 font-mono text-sm">
        {codes.map((code) => (
          <span key={code}>{code}</span>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => void handleCopyAll()}
      >
        {copied ? (
          <Check className="mr-2 h-4 w-4" />
        ) : (
          <Copy className="mr-2 h-4 w-4" />
        )}
        {t('mfa.recoveryCodes.copyAll')}
      </Button>
      <Button type="button" className="w-full" onClick={onContinue}>
        {continueLabel}
      </Button>
    </div>
  );
}
