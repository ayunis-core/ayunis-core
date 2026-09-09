import type { ComponentProps, Ref } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ayunis/ui/components/tabs';
import {
  getChatSidePanelTab,
  resolveChatSidePanelView,
} from '@/pages/chat/model/chat-side-panel';
import type {
  ChatSidePanelTab,
  ChatSidePanelView,
} from '@/pages/chat/model/chat-side-panel';
import {
  useIsKnowledgeBasesEnabled,
  useIsSkillsEnabled,
} from '@/features/feature-toggles';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { ArtifactListSidePanel } from './ArtifactListSidePanel';
import { ArtifactSidePanel } from './ArtifactSidePanel';
import { ChatContextSidePanel } from './ChatContextSidePanel';

interface ChatSidePanelProps {
  readonly threadId: string;
  readonly view: ChatSidePanelView;
  readonly artifactPanelRef: Ref<ArtifactPanelHandle>;
  readonly artifactPanelProps: ComponentProps<typeof ArtifactSidePanel>;
  readonly onSelectArtifact: (artifactId: string) => void;
  readonly onTabChange: (tab: ChatSidePanelTab) => void;
  readonly onClose: () => void;
}

export function ChatSidePanel({
  threadId,
  view,
  artifactPanelRef,
  artifactPanelProps,
  onSelectArtifact,
  onTabChange,
  onClose,
}: Readonly<ChatSidePanelProps>) {
  const { t } = useTranslation('chat');
  const skillsEnabled = useIsSkillsEnabled();
  const knowledgeBasesEnabled = useIsKnowledgeBasesEnabled();
  const contextEnabled = skillsEnabled || knowledgeBasesEnabled;
  const effectiveView = resolveChatSidePanelView(view, contextEnabled);
  const activeTab = getChatSidePanelTab(effectiveView);

  return (
    <aside
      id="chat-side-panel"
      className="flex h-full min-h-0 flex-col overflow-hidden border-l bg-background"
      data-testid="chat-side-panel"
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === 'artifacts' || value === 'context') onTabChange(value);
        }}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <TabsList>
            <TabsTrigger
              value="artifacts"
              data-testid="chat-side-panel-tab-artifacts"
            >
              {t('chat.artifactPanel.title')}
            </TabsTrigger>
            {contextEnabled && (
              <TabsTrigger
                value="context"
                data-testid="chat-side-panel-tab-context"
              >
                {t('chat.context.tab')}
              </TabsTrigger>
            )}
          </TabsList>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            data-testid="chat-side-panel-close"
            onClick={onClose}
            aria-label={t('chat.sidePanel.close')}
          >
            <X className="size-4" />
          </Button>
        </div>
        <TabsContent
          value="artifacts"
          className="min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ArtifactPanelContent
            threadId={threadId}
            view={effectiveView}
            artifactPanelRef={artifactPanelRef}
            artifactPanelProps={artifactPanelProps}
            onSelectArtifact={onSelectArtifact}
          />
        </TabsContent>
        {contextEnabled && (
          <TabsContent
            value="context"
            className="min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
          >
            <ChatContextSidePanel key={threadId} threadId={threadId} />
          </TabsContent>
        )}
      </Tabs>
    </aside>
  );
}

function ArtifactPanelContent({
  threadId,
  view,
  artifactPanelRef,
  artifactPanelProps,
  onSelectArtifact,
}: Readonly<Omit<ChatSidePanelProps, 'onTabChange' | 'onClose'>>) {
  if (view === 'artifact-list') {
    return (
      <ArtifactListSidePanel
        key={threadId}
        threadId={threadId}
        onSelect={onSelectArtifact}
      />
    );
  }
  if (view === 'artifact-detail') {
    return (
      <ArtifactSidePanel
        ref={artifactPanelRef}
        {...artifactPanelProps}
        showClose={false}
      />
    );
  }
  return null;
}
