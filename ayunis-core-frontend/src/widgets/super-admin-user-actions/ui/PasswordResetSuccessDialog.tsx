import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { Input } from '@ayunis/ui/components/input';
import { Label } from '@ayunis/ui/components/label';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';

interface PasswordResetSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resetUrl: string;
  userEmail: string;
}

export function PasswordResetSuccessDialog({
  open,
  onOpenChange,
  resetUrl,
  userEmail,
}: Readonly<PasswordResetSuccessDialogProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const [isCopied, setIsCopied] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) setIsCopied(false);
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(resetUrl);
      setIsCopied(true);
      showSuccess(t('passwordResetSuccess.copied'));
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      showError(t('passwordResetSuccess.copyError'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{t('passwordResetSuccess.title')}</DialogTitle>
          <DialogDescription>
            {t('passwordResetSuccess.description', { email: userEmail })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resetUrl" className="text-sm font-medium">
              {t('passwordResetSuccess.urlLabel')}
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="resetUrl"
                value={resetUrl}
                readOnly
                className="bg-muted"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyToClipboard()}
              >
                {isCopied ? <Check /> : <Copy />}
                {isCopied
                  ? t('passwordResetSuccess.copiedButton')
                  : t('passwordResetSuccess.copyButton')}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => handleOpenChange(false)}>
              {t('passwordResetSuccess.close')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
