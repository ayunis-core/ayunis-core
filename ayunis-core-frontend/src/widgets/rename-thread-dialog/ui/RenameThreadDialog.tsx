import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { useRenameThread } from '@/features/useRenameThread';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';

interface RenameThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
  currentTitle: string | null;
}

const MAX_TITLE_LENGTH = 200;

export function RenameThreadDialog({
  open,
  onOpenChange,
  threadId,
  currentTitle,
}: RenameThreadDialogProps) {
  const { t } = useTranslation('common');
  const [title, setTitle] = useState(currentTitle || '');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { rename, isRenaming } = useRenameThread({
    onSuccess: () => {
      showSuccess(t('sidebar.renameThreadSuccess'));
      onOpenChange(false);
    },
    onError: () => {
      showError(t('sidebar.renameThreadError'));
    },
  });

  // Reset title when dialog opens with new thread
  useEffect(() => {
    if (open) {
      setTitle(currentTitle || '');
      setError(null);
    }
  }, [open, currentTitle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError(t('sidebar.renameThreadEmptyError'));
      return;
    }

    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      setError(t('sidebar.renameThreadMaxLengthError', { max: MAX_TITLE_LENGTH }));
      return;
    }

    setError(null);
    rename(threadId, trimmedTitle);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }

    // Show error if exceeding max length (use trimmed length for consistency)
    if (newTitle.trim().length > MAX_TITLE_LENGTH) {
      setError(t('sidebar.renameThreadMaxLengthError', { max: MAX_TITLE_LENGTH }));
    }
  };

  const handleOpenAutoFocus = (event: Event) => {
    event.preventDefault();
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" onOpenAutoFocus={handleOpenAutoFocus}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('sidebar.renameThreadTitle')}</DialogTitle>
            <DialogDescription>
              {t('sidebar.renameThreadDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">{t('sidebar.renameThreadLabel')}</Label>
              <Input
                ref={inputRef}
                id="title"
                value={title}
                onChange={handleTitleChange}
                placeholder={t('sidebar.renameThreadPlaceholder')}
                maxLength={MAX_TITLE_LENGTH + 1}
                aria-invalid={!!error}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <p className="text-xs text-muted-foreground text-right">
                {title.trim().length}/{MAX_TITLE_LENGTH}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isRenaming}
            >
              {t('sidebar.renameThreadCancel')}
            </Button>
            <Button
              type="submit"
              disabled={isRenaming || !title.trim() || title.trim().length > MAX_TITLE_LENGTH}
            >
              {isRenaming ? t('common.loading') : t('sidebar.renameThreadConfirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
