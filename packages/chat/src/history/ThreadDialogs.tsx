import {
  useId,
  useRef,
  useState,
  type ComponentProps,
  type RefObject,
  type SyntheticEvent,
} from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Input } from '@ayunis/ui/components/input';
import { Label } from '@ayunis/ui/components/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ayunis/ui/components/dialog';

const MAX_TITLE_LENGTH = 200;

export function RenameThreadDialog({
  open,
  onOpenChange,
  currentTitle,
  onRename,
  busy = false,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTitle: string | null;
  onRename: (title: string) => void;
  busy?: boolean;
}>) {
  const [title, setTitle] = useOpeningTitle(open, currentTitle);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const name = title.trim();
  const tooLong = name.length > MAX_TITLE_LENGTH;
  function submit(event: SyntheticEvent) {
    event.preventDefault();
    if (name && !tooLong) onRename(name);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <RenameThreadContent
        id={id}
        input={input}
        title={title}
        name={name}
        tooLong={tooLong}
        busy={busy}
        onTitle={setTitle}
        onCancel={() => onOpenChange(false)}
        onSubmit={submit}
      />
    </Dialog>
  );
}

function useOpeningTitle(open: boolean, currentTitle: string | null) {
  const [wasOpen, setWasOpen] = useState(open);
  const [title, setTitle] = useState(currentTitle ?? '');
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTitle(currentTitle ?? '');
  }
  return [title, setTitle] as const;
}

function RenameThreadContent({
  input,
  onSubmit,
  ...fieldProps
}: RenameThreadContentProps) {
  const { t } = useTranslation('common');
  return (
    <DialogContent
      className="sm:max-w-[425px]"
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        input.current?.focus();
        input.current?.select();
      }}
    >
      <form onSubmit={onSubmit}>
        <DialogHeader>
          <DialogTitle>{t('sidebar.renameThreadTitle')}</DialogTitle>
          <DialogDescription>
            {t('sidebar.renameThreadDescription')}
          </DialogDescription>
        </DialogHeader>
        <RenameTitleField input={input} {...fieldProps} />
        <RenameThreadActions {...fieldProps} />
      </form>
    </DialogContent>
  );
}

interface RenameFieldProps {
  id: string;
  title: string;
  name: string;
  tooLong: boolean;
  busy: boolean;
  onTitle: (title: string) => void;
  onCancel: () => void;
}

type RenameThreadContentProps = RenameFieldProps & {
  input: RefObject<HTMLInputElement | null>;
  onSubmit: (event: SyntheticEvent) => void;
};

function RenameTitleField({
  id,
  input,
  title,
  name,
  tooLong,
  onTitle,
}: Readonly<
  Pick<
    RenameThreadContentProps,
    'id' | 'input' | 'title' | 'name' | 'tooLong' | 'onTitle'
  >
>) {
  const { t } = useTranslation('common');
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor={id}>{t('sidebar.renameThreadLabel')}</Label>
        <Input
          ref={input}
          id={id}
          data-testid="rename-input"
          placeholder={t('sidebar.renameThreadPlaceholder')}
          value={title}
          maxLength={MAX_TITLE_LENGTH + 1}
          aria-invalid={tooLong}
          onChange={(event) => onTitle(event.target.value)}
        />
        {tooLong && (
          <p className="text-sm text-destructive">
            {t('sidebar.renameThreadMaxLengthError', {
              max: MAX_TITLE_LENGTH,
            })}
          </p>
        )}
        <p className="text-right text-xs text-muted-foreground">
          {name.length}/{MAX_TITLE_LENGTH}
        </p>
      </div>
    </div>
  );
}

function RenameThreadActions({
  busy,
  name,
  tooLong,
  onCancel,
}: Readonly<Pick<RenameFieldProps, 'busy' | 'name' | 'tooLong' | 'onCancel'>>) {
  const { t } = useTranslation('common');
  return (
    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={onCancel}
      >
        {t('sidebar.renameThreadCancel')}
      </Button>
      <Button
        type="submit"
        data-testid="rename-submit"
        disabled={busy || !name || tooLong}
      >
        {busy ? t('common.loading') : t('sidebar.renameThreadConfirm')}
      </Button>
    </DialogFooter>
  );
}

export function ChatHistoryDeleteAction({
  title,
  busy,
  onDelete,
}: Readonly<{
  title: string;
  busy?: boolean;
  onDelete: () => void;
}>) {
  const { t } = useTranslation('chats');
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DeleteTrigger label={t('card.confirmDelete.title')} busy={busy} />
      </DialogTrigger>
      <DialogDeleteContent title={title} onDelete={onDelete} />
    </Dialog>
  );
}

function DeleteTrigger({
  label,
  busy,
  ...props
}: Readonly<
  { label: string; busy?: boolean } & ComponentProps<typeof Button>
>) {
  return (
    <Button
      {...props}
      type="button"
      variant="destructive-ghost"
      size="icon"
      aria-label={label}
      disabled={busy || props.disabled}
    >
      <Trash2 />
    </Button>
  );
}

function DialogDeleteContent({
  title,
  onDelete,
}: Readonly<{ title: string; onDelete: () => void }>) {
  const { t } = useTranslation('chats');
  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{t('card.confirmDelete.title')}</DialogTitle>
        <DialogDescription>
          {t('card.confirmDelete.description', { title })}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose asChild>
          <Button
            type="button"
            variant="outline"
            data-testid="confirmation-cancel"
          >
            {t('card.confirmDelete.cancelText')}
          </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button
            type="button"
            variant="destructive"
            data-testid="confirmation-confirm"
            onClick={onDelete}
          >
            {t('card.confirmDelete.confirmText')}
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
