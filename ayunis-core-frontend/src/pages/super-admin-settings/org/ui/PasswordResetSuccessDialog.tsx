import { Button } from '@/shared/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showSuccess } from '@/shared/lib/toast';

interface PasswordResetSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resetUrl: string;
  userEmail: string;
}

export default function PasswordResetSuccessDialog({
  open,
  onOpenChange,
  resetUrl,
  userEmail,
}: Readonly<PasswordResetSuccessDialogProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const [isCopied, setIsCopied] = useState(false);

  function handleClose() {
    onOpenChange(false);
    setIsCopied(false);
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(resetUrl);
      setIsCopied(true);
      showSuccess(t('passwordResetSuccess.copied'));
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>{t('passwordResetSuccess.copiedButton')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>{t('passwordResetSuccess.copyButton')}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleClose}>
              {t('passwordResetSuccess.close')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
