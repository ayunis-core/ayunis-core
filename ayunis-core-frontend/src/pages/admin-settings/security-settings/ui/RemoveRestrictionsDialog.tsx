import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';

interface RemoveRestrictionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isRemoving: boolean;
}

export function RemoveRestrictionsDialog({
  open,
  onOpenChange,
  onConfirm,
  isRemoving,
}: Readonly<RemoveRestrictionsDialogProps>) {
  const { t } = useTranslation('admin-settings-security');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('ipAllowlist.removeConfirmTitle')}</DialogTitle>
          <DialogDescription>
            {t('ipAllowlist.removeConfirmDescription')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRemoving}
          >
            {t('ipAllowlist.removeConfirmCancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isRemoving}
          >
            {isRemoving
              ? t('ipAllowlist.removing')
              : t('ipAllowlist.removeConfirmConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
