import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/shadcn/dialog';
import { Loader2 } from 'lucide-react';
import { isValidUrl } from '../lib/isValidUrl';

export function AddUrlDialog({
  open,
  onOpenChange,
  urlInput,
  onUrlChange,
  onSubmit,
  isAddingUrl,
  t,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urlInput: string;
  onUrlChange: (value: string) => void;
  onSubmit: () => void;
  isAddingUrl: boolean;
  t: (key: string) => string;
}>) {
  const isUrlValid = urlInput.trim() !== '' && isValidUrl(urlInput.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('detail.documents.urlDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('detail.documents.urlDialogDescription')}
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="add-url-input" className="sr-only">
            {t('detail.documents.urlLabel')}
          </Label>
          <Input
            id="add-url-input"
            type="url"
            placeholder={t('detail.documents.urlPlaceholder')}
            value={urlInput}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isUrlValid && !isAddingUrl) onSubmit();
            }}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAddingUrl}
          >
            {t('detail.documents.urlDialogCancel')}
          </Button>
          <Button onClick={onSubmit} disabled={!isUrlValid || isAddingUrl}>
            {isAddingUrl && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('detail.documents.addUrl')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
