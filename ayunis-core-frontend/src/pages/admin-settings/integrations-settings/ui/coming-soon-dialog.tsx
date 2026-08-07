import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogDescription,
} from '@ayunis/ui/components/dialog';
import { useTranslation } from 'react-i18next';
interface ComingSoonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComingSoonDialog({
  open,
  onOpenChange,
}: Readonly<ComingSoonDialogProps>) {
  const { t } = useTranslation('admin-settings-integrations');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('integrations.comingSoonDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('integrations.comingSoonDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="default" onClick={() => onOpenChange(false)}>
            {t('integrations.comingSoonDialog.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
