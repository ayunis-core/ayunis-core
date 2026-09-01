import { useTranslation } from 'react-i18next';
import NewChatPageLayout from '@/pages/new-chat/ui/NewChatPageLayout';
import { useTimeBasedGreeting } from '@/pages/new-chat/model/useTimeBasedGreeting';
import { PinnedSkills } from '@/pages/new-chat/ui/PinnedSkills';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { PrototypeChatInput } from '@/pages/chat-context-prototype/ui/PrototypeChatInput';

export function PrototypeNewChat() {
  const { t } = useTranslation('chat');
  const greeting = useTimeBasedGreeting();
  return (
    <NewChatPageLayout
      header={
        <ContentAreaHeader breadcrumbs={[{ label: t('newChat.newChat') }]} />
      }
      compose={
        <>
          <h1 className="new-chat-greeting text-center text-2xl font-bold">
            {greeting}
          </h1>
          <div className="new-chat-input-stack relative w-full">
            <PrototypeChatInput attachedIds={[]} processingIds={[]} />
          </div>
          <div className="new-chat-dock-extras mt-4 flex flex-col gap-4 overflow-hidden">
            <PinnedSkills onSkillSelect={() => {}} />
          </div>
        </>
      }
    />
  );
}
