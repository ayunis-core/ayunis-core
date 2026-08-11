import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowUp } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { handOffChatDraft } from '@/features/chat-draft-handoff';

interface WorkspaceChatStarterProps {
  workspaceId: string;
}

/**
 * Starts a chat inside this workspace. Rather than rebuilding the chat
 * composer (attachments, skills, knowledge bases, anonymous mode all live in
 * the new-chat flow), this hands the typed message over to that flow with the
 * workspace preselected, so the chat is created with everything it supports.
 */
export function WorkspaceChatStarter({
  workspaceId,
}: Readonly<WorkspaceChatStarterProps>) {
  const { t } = useTranslation('workspace');
  const navigate = useNavigate();
  const [message, setMessage] = useState('');

  function start() {
    const draft = message.trim();
    if (!draft) {
      return;
    }
    // The draft travels in memory, not as a search param — the typed text
    // must not end up in browser history or URL logs.
    handOffChatDraft(draft);
    void navigate({ to: '/chat', search: { workspaceId } });
  }

  return (
    <div className="rounded-2xl border bg-background/50 p-2">
      {/* Native textarea: the @ayunis/ui Textarea brings its own border,
          shadow and focus ring, which the surrounding container provides. */}
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            start();
          }
        }}
        rows={2}
        placeholder={t('page.chatPlaceholder')}
        className="w-full resize-none bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground md:text-sm"
      />
      <div className="flex justify-end">
        <Button
          size="icon"
          aria-label={t('page.newChat')}
          onClick={start}
          disabled={!message.trim()}
        >
          <ArrowUp />
        </Button>
      </div>
    </div>
  );
}
