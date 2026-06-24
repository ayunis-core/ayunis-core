import { Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { isValidUrl } from '../lib/isValidUrl';

/** Link-depth options offered when adding a URL (0 = just this page). */
const URL_DEPTH_OPTIONS = [0, 1, 2] as const;

export function AddUrlDialog({
  open,
  onOpenChange,
  urlInput,
  onUrlChange,
  depth,
  onDepthChange,
  onSubmit,
  isAddingUrl,
  t,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urlInput: string;
  onUrlChange: (value: string) => void;
  depth: number;
  onDepthChange: (value: number) => void;
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
        <div className="grid gap-2">
          <Label htmlFor="add-url-depth">
            {t('detail.documents.urlDepthLabel')}
          </Label>
          <Select
            value={String(depth)}
            onValueChange={(value) => onDepthChange(Number(value))}
            disabled={isAddingUrl}
          >
            <SelectTrigger id="add-url-depth" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {URL_DEPTH_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {t(`detail.documents.urlDepthOption${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t('detail.documents.urlDepthHint')}
          </p>
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
