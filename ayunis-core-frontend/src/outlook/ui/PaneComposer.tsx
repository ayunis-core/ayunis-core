import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Square } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Textarea } from '@ayunis/ui/components/textarea';

export function PaneComposer({
  running,
  onSend,
  onStop,
}: Readonly<{
  running: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}>) {
  const { t } = useTranslation();
  const [text, setText] = useState('');

  function submit() {
    if (running || !text.trim()) return;
    onSend(text);
    setText('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('chat.placeholder')}
        aria-label={t('chat.placeholder')}
        className="max-h-40 min-h-10 resize-none"
        data-testid="outlook-pane-composer"
      />
      {running ? (
        <Button
          size="icon"
          variant="outline"
          onClick={onStop}
          aria-label={t('chat.stop')}
          data-testid="outlook-pane-stop"
        >
          <Square />
        </Button>
      ) : (
        <Button
          size="icon"
          onClick={submit}
          disabled={!text.trim()}
          aria-label={t('chat.send')}
          data-testid="outlook-pane-send"
        >
          <ArrowUp />
        </Button>
      )}
    </div>
  );
}
