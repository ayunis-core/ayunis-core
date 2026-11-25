import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@ayunis/ui/lib/cn';
import { Button } from '@ayunis/ui/components/button';
import { NewChatBackdrop, useComposeLift } from '@ayunis/chat/new-chat';
import { useEmailGreeting } from '@/outlook/lib/use-email-greeting';

export function PaneNewChatLayout({
  header,
  busy,
  waiting,
  onStarter,
  composer,
}: Readonly<{
  header: ReactNode;
  busy: boolean;
  waiting: boolean;
  onStarter: (prompt: string) => void;
  composer: ReactNode;
}>) {
  const { t } = useTranslation('chat');
  const greeting = useEmailGreeting();
  const { stageRef, composeRef, liftPx } = useComposeLift(true, busy);
  const prompts = [
    t('newChat.embedded.prepareReply'),
    t('newChat.embedded.summarizeEmail'),
  ];

  return (
    <main
      className="absolute inset-0 overflow-hidden"
      data-testid="outlook-new-chat"
    >
      <NewChatBackdrop phase={busy ? 'exiting' : 'idle'} />
      <div className="absolute inset-0 z-[1] flex min-h-0 flex-col">
        <div className="outlook-page-header">{header}</div>
        <div
          ref={stageRef}
          className="flex min-h-0 flex-1 flex-col justify-end px-2 pb-2 sm:px-4 sm:pb-4"
        >
          <div
            ref={composeRef}
            className={cn(
              'new-chat-compose mx-auto w-full max-w-[800px]',
              busy ? 'new-chat-compose--settling' : 'new-chat-compose--idle',
            )}
            style={
              busy
                ? undefined
                : ({ '--new-chat-lift': `${liftPx}px` } as React.CSSProperties)
            }
          >
            <div className="new-chat-compose__content flex w-full flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-700 fill-mode-both [animation-delay:200ms]">
              <h1
                className={cn(
                  'new-chat-greeting text-center text-xl font-bold',
                  busy && 'new-chat-greeting--exit',
                )}
                aria-hidden={busy}
              >
                {greeting}
              </h1>
              {!busy && (
                <div className="flex flex-wrap justify-center gap-2">
                  {prompts.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={waiting}
                      onClick={() => onStarter(prompt)}
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
                    busy && 'new-chat-disclaimer--visible',
                  )}
                  aria-hidden={!busy}
                >
                  {t('chat.inputDisclaimer')}
                </p>
                {composer}
              </div>
              {!busy && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3 shrink-0" />
                  <span>{t('newChat.privacyHint')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
