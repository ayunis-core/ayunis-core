import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NewChat, type ChatViewConfig } from '@ayunis/chat/surface';
import type { ChatRunLifecycle } from '@ayunis/chat/runs';
import { useEmailGreeting } from '@/outlook/lib/use-email-greeting';

type PaneNewChatProps = Readonly<{
  draftKey: string;
  header: ReactNode;
  config: ChatViewConfig;
  lifecycle: ChatRunLifecycle;
}>;

export function PaneNewChat({
  draftKey,
  header,
  config,
  lifecycle,
}: PaneNewChatProps) {
  const { t } = useTranslation('chat');
  const greeting = useEmailGreeting();
  const starterPrompts = [
    t('newChat.embedded.prepareReply'),
    t('newChat.embedded.summarizeEmail'),
  ].map((prompt) => ({ label: prompt, prompt }));

  return (
    <main
      className="absolute inset-0 isolate flex flex-col overflow-hidden"
      data-testid="outlook-new-chat"
    >
      <div className="sticky top-0 z-10 mb-1.5 w-full shrink-0 bg-background px-3 pt-2">
        {header}
      </div>
      <NewChat
        config={config}
        content={{ greeting: { title: greeting }, starterPrompts }}
        lifecycle={lifecycle}
        draftKey={draftKey}
      />
    </main>
  );
}
