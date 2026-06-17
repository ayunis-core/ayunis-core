import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/shadcn/alert-dialog';
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('ipAllowlist.removeConfirmTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('ipAllowlist.removeConfirmDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
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
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
