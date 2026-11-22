import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { History, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';
import { emailGreetings } from '@/pages/new-chat/model/email-greetings-data';
import { useTimeBasedGreeting } from '@/pages/new-chat/model/useTimeBasedGreeting';

export function EmbeddedHistoryButton() {
  const { t } = useTranslation('chat');

  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      aria-label={t('chat.chats')}
      data-testid="embedded-history"
    >
      <Link to="/chats">
        <History className="h-5 w-5" />
      </Link>
    </Button>
  );
}

interface EmbeddedNewChatComposeProps {
  chatInput: ReactNode;
  isCreating: boolean;
  isStarterDisabled: boolean;
  onStarterPrompt: (prompt: string) => void;
}

export function EmbeddedNewChatCompose({
  chatInput,
  isCreating,
  isStarterDisabled,
  onStarterPrompt,
}: Readonly<EmbeddedNewChatComposeProps>) {
  const { t } = useTranslation('chat');
  const greeting = useTimeBasedGreeting(emailGreetings);
  // Starter prompts send their own label, as ordinary chat messages.
  const starterPrompts = [
    t('newChat.embedded.prepareReply'),
    t('newChat.embedded.summarizeEmail'),
  ];

  return (
    <>
      <h1
        className={cn(
          'new-chat-greeting text-center text-xl font-bold',
          isCreating && 'new-chat-greeting--exit',
        )}
        aria-hidden={isCreating}
      >
        {greeting}
      </h1>

      {!isCreating && (
        <div className="flex flex-wrap justify-center gap-2">
          {starterPrompts.map((prompt) => (
            <Button
              key={prompt}
              variant="outline"
              size="sm"
              disabled={isStarterDisabled}
              onClick={() => onStarterPrompt(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </div>
      )}

      <div className="new-chat-input-stack relative w-full">
        <p
          className={cn(
            'new-chat-disclaimer absolute bottom-full left-0 right-0 mb-2 text-center text-xs text-muted-foreground',
            isCreating && 'new-chat-disclaimer--visible',
          )}
          aria-hidden={!isCreating}
        >
          {t('chat.inputDisclaimer')}
        </p>
        {chatInput}
      </div>

      {!isCreating && (
        <div className="flex justify-center items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" />
          <span>{t('newChat.privacyHint')}</span>
        </div>
      )}
    </>
  );
}
