import { useTranslation } from 'react-i18next';
import { AlertTriangle, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { showError, showSuccess } from '@/shared/lib/toast';

interface RevealSecretDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secret: string | null;
}

export function RevealSecretDialog({
  open,
  onOpenChange,
  secret,
}: Readonly<RevealSecretDialogProps>) {
  const { t } = useTranslation('admin-settings-api-keys');

  async function handleCopy() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      showSuccess(t('apiKeys.revealDialog.copied'));
    } catch {
      showError(t('apiKeys.revealDialog.copyError'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[560px]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t('apiKeys.revealDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('apiKeys.revealDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          <Alert variant="warning">
            <AlertTriangle />
            <AlertDescription>
              {t('apiKeys.revealDialog.warning')}
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Input
              readOnly
              value={secret ?? ''}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleCopy()}
              disabled={!secret}
            >
              <Copy className="h-4 w-4" />
              {t('apiKeys.revealDialog.copy')}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t('apiKeys.revealDialog.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
