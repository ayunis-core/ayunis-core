import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ayunis/ui/components/alert-dialog';

export function SharingBlockedDialog({
  translationNs,
  open,
  onOpenChange,
}: Readonly<{
  translationNs: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const { t } = useTranslation(translationNs);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="shares-blocked-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('shares.deprecation.blocked.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('shares.deprecation.blocked.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction data-testid="shares-blocked-dialog-close">
            {t('shares.deprecation.blocked.close')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
