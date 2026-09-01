import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import NewChatPageLayout from '@/pages/new-chat/ui/NewChatPageLayout';
import { WorkspacePicker } from '@/pages/new-chat/ui/WorkspacePicker';
import { useTimeBasedGreeting } from '@/pages/new-chat/model/useTimeBasedGreeting';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { useIsWorkspacesEnabled } from '@/features/feature-toggles';
import { useJourneyControls } from '@/widgets/prototype-journey';
import { useAvailability } from '@/pages/chat-context-prototype/model/useAvailability';
import { PrototypeChatInput } from '@/pages/chat-context-prototype/ui/PrototypeChatInput';
import { AvailabilityDropdowns } from '@/pages/chat-context-prototype/ui/availability/AvailabilityDropdowns';
import { AvailabilityInline } from '@/pages/chat-context-prototype/ui/availability/AvailabilityInline';
import { AvailabilityHint } from '@/pages/new-chat/ui/AvailabilityHint';

export function PrototypeNewChat() {
  const { t } = useTranslation('chat');
  const greeting = useTimeBasedGreeting();
  const isWorkspacesEnabled = useIsWorkspacesEnabled();
  const { availabilityVariant } = useJourneyControls();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const availability = useAvailability(workspaceId);
  const skillCount = availability.skills.length + availability.projectSkills;
  const knowledgeCount =
    availability.knowledgeBases.length + availability.projectKnowledge;

  function renderRowVariant() {
    if (availabilityVariant === 'row') {
      return <AvailabilityHint workspaceId={workspaceId} />;
    }
    if (availabilityVariant === 'dropdowns') {
      return (
        <AvailabilityDropdowns
          skills={availability.skills}
          knowledgeBases={availability.knowledgeBases}
        />
      );
    }
    return null;
  }

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
            <div className="mt-1.5 flex items-center justify-between gap-2">
              {isWorkspacesEnabled ? (
                <WorkspacePicker
                  workspaceId={workspaceId}
                  onWorkspaceChange={setWorkspaceId}
                />
              ) : (
                <span />
              )}
              {availabilityVariant === 'underInput' ? (
                <AvailabilityInline
                  skillCount={skillCount}
                  knowledgeCount={knowledgeCount}
                />
              ) : (
                renderRowVariant()
              )}
            </div>
          </div>
        </>
      }
    />
  );
}
