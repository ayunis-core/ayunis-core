import { Button } from '@/shared/ui/shadcn/button';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogDescription,
} from '@/shared/ui/shadcn/dialog';
import { useTranslation } from 'react-i18next';
interface ComingSoonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComingSoonDialog({
  open,
  onOpenChange,
}: ComingSoonDialogProps) {
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
