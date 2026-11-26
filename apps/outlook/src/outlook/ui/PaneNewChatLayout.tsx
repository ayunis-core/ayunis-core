import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NewChatShell } from '@ayunis/chat/new-chat';
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
  const prompts = [
    {
      id: 'prepare-reply',
      label: t('newChat.embedded.prepareReply'),
      disabled: waiting,
      onSelect: () => onStarter(t('newChat.embedded.prepareReply')),
    },
    {
      id: 'summarize-email',
      label: t('newChat.embedded.summarizeEmail'),
      disabled: waiting,
      onSelect: () => onStarter(t('newChat.embedded.summarizeEmail')),
    },
  ];

  return (
    <NewChatShell
      as="main"
      layout="narrow"
      testId="outlook-new-chat"
      header={header}
      greeting={greeting}
      starterPrompts={prompts}
      composer={composer}
      privacyHint={t('newChat.privacyHint')}
      disclaimer={t('chat.inputDisclaimer')}
      isSettling={busy}
      backdropPhase={busy ? 'exiting' : 'idle'}
    />
  );
}
