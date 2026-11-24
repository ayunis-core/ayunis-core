import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Input } from '@ayunis/ui/components/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@ayunis/ui/components/alert-dialog';
import { ChatHistory } from '@ayunis/chat/history';
import type { ChatCapabilities } from './chat-surface-config';
import { useChatAction } from './use-chat-action';

export interface ChatHistoryConfig {
  readonly chats: readonly { id: string; title?: string }[];
  readonly onSelect: (id: string) => void;
  readonly rename?: (
    id: string,
    title: string,
    signal: AbortSignal,
  ) => Promise<void>;
  readonly remove?: (id: string, signal: AbortSignal) => Promise<void>;
  readonly empty?: ReactNode;
  readonly pagination?: ReactNode;
  readonly actions?: (id: string) => ReactNode;
}

interface HistoryProps extends ChatHistoryConfig {
  readonly capabilities: ChatCapabilities;
  readonly onError?: (error: unknown) => void;
}

export function ConfiguredHistory(props: HistoryProps) {
  const { t } = useTranslation('common');

  return (
    <nav
      aria-label={t('chatSurface.history', { defaultValue: 'Chat history' })}
    >
      <ChatHistory
        chats={props.chats}
        empty={props.empty}
        pagination={props.pagination}
        renderChat={({ id, title }) => (
          <HistoryRow
            {...props}
            id={id}
            title={
              title ||
              t('chatSurface.untitled', { defaultValue: 'Untitled chat' })
            }
          />
        )}
      />
    </nav>
  );
}

function HistoryRow({
  id,
  title,
  onSelect,
  capabilities,
  rename,
  remove,
  actions,
  onError,
}: Readonly<Omit<HistoryProps, 'chats'> & { id: string; title: string }>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="ghost" onClick={() => onSelect(id)}>
        {title}
      </Button>
      {capabilities.rename && rename && (
        <RenameHistory
          title={title}
          onError={onError}
          rename={(nextTitle, signal) => rename(id, nextTitle, signal)}
        />
      )}
      {capabilities.delete && remove && (
        <DeleteHistory
          title={title}
          onError={onError}
          remove={(signal) => remove(id, signal)}
        />
      )}
      {actions?.(id)}
    </div>
  );
}

function RenameHistory({
  title,
  rename,
  onError,
}: Readonly<{
  title: string;
  rename: (title: string, signal: AbortSignal) => Promise<void>;
  onError?: (error: unknown) => void;
}>) {
  const { t } = useTranslation('common');
  const [next, setNext] = useState<string | null>(null);
  const action = useChatAction(onError);

  if (next === null)
    return (
      <Button
        type="button"
        variant="ghost"
        aria-label={t('chatSurface.renameChat', {
          defaultValue: 'Rename {{title}}',
          title,
        })}
        onClick={() => setNext(title)}
      >
        {t('chatSurface.rename', { defaultValue: 'Rename' })}
      </Button>
    );

  function submit(title: string) {
    void action
      .run((signal) => rename(title, signal))
      .then((ok) => {
        if (ok) setNext(null);
      });
  }

  return (
    <RenameForm
      title={next}
      busy={action.busy}
      change={setNext}
      save={submit}
    />
  );
}

function RenameForm({
  title,
  busy,
  change,
  save,
}: Readonly<{
  title: string;
  busy: boolean;
  change: (title: string | null) => void;
  save: (title: string) => void;
}>) {
  const { t } = useTranslation('common');
  const name = title.trim();
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (name) save(name);
      }}
    >
      <Input
        aria-label={t('chatSurface.title', { defaultValue: 'Chat title' })}
        value={title}
        onChange={(event) => change(event.target.value)}
        disabled={busy}
      />
      <Button type="submit" disabled={busy || !name}>
        {t('chatSurface.saveTitle', { defaultValue: 'Save title' })}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={busy}
        onClick={() => change(null)}
      >
        {t('cancel', { defaultValue: 'Cancel' })}
      </Button>
    </form>
  );
}

function DeleteHistory({
  title,
  remove,
  onError,
}: Readonly<{
  title: string;
  remove: (signal: AbortSignal) => Promise<void>;
  onError?: (error: unknown) => void;
}>) {
  const { t } = useTranslation('common');
  const action = useChatAction(onError);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="destructive-ghost"
          disabled={action.busy}
          aria-label={t('chatSurface.deleteChatTitle', {
            defaultValue: 'Delete {{title}}',
            title,
          })}
        >
          {t('chatSurface.delete', { defaultValue: 'Delete' })}
        </Button>
      </AlertDialogTrigger>
      <DeleteConfirmation
        title={title}
        confirm={() => {
          void action.run(remove);
        }}
      />
    </AlertDialog>
  );
}

function DeleteConfirmation({
  title,
  confirm,
}: Readonly<{ title: string; confirm: () => void }>) {
  const { t } = useTranslation('common');
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {t('chatSurface.confirmDelete', {
            defaultValue: 'Delete {{title}}?',
            title,
          })}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {t('chatSurface.deleteDescription', {
            defaultValue: 'This chat will be permanently deleted.',
          })}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>
          {t('cancel', { defaultValue: 'Cancel' })}
        </AlertDialogCancel>
        <AlertDialogAction variant="destructive" onClick={confirm}>
          {t('chatSurface.deleteChat', { defaultValue: 'Delete chat' })}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
