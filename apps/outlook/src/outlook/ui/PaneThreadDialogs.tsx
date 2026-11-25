import { useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ayunis/ui/components/alert-dialog';
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

export function PaneDeleteDialog({
  title,
  open,
  onClose,
  onDelete,
}: Readonly<{
  title: string;
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
}>) {
  const { t } = useTranslation('chats');
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('card.confirmDelete.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('card.confirmDelete.description', { title })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t('card.confirmDelete.cancelText')}
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDelete}>
            {t('card.confirmDelete.confirmText')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PaneRenameDialog({
  title,
  onChange,
  onClose,
  onRename,
}: Readonly<{
  title: string | null;
  onChange: (title: string) => void;
  onClose: () => void;
  onRename: (title: string) => void;
}>) {
  const { t } = useTranslation('common');
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const name = title?.trim() ?? '';
  const maxLength = 200;
  const tooLong = name.length > maxLength;

  return (
    <Dialog
      open={title !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-[425px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          input.current?.select();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (name && !tooLong) onRename(name);
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('sidebar.renameThreadTitle')}</DialogTitle>
            <DialogDescription>
              {t('sidebar.renameThreadDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor={id}>{t('sidebar.renameThreadLabel')}</Label>
              <Input
                ref={input}
                id={id}
                data-testid="rename-input"
                placeholder={t('sidebar.renameThreadPlaceholder')}
                value={title ?? ''}
                maxLength={maxLength + 1}
                aria-invalid={tooLong}
                onChange={(event) => onChange(event.target.value)}
              />
              {tooLong && (
                <p className="text-sm text-destructive">
                  {t('sidebar.renameThreadMaxLengthError', { max: maxLength })}
                </p>
              )}
              <p className="text-right text-xs text-muted-foreground">
                {name.length}/{maxLength}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('sidebar.renameThreadCancel')}
            </Button>
            <Button
              type="submit"
              data-testid="rename-submit"
              disabled={!name || tooLong}
            >
              {t('sidebar.renameThreadConfirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
