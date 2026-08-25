import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import AppLayout from '@/layouts/app-layout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import {
  JOURNEY,
  type EntryVariant,
  type PanelKey,
  type PrototypeState,
} from '@/pages/chat-context-prototype/model/journey';
import { EntryControls } from './EntryControls';
import { JourneyBar } from './JourneyBar';
import { PrototypeInput } from './PrototypeInput';
import { NewChatView } from './NewChatView';
import { PrototypeChatLayout } from './PrototypeChatLayout';
import { PrototypeSidePanel } from './PrototypeSidePanel';
import { SourceDialog } from './SourceDialog';
import { PrototypeTranscript } from './PrototypeTranscript';

export function ChatContextPrototypePage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [variant, setVariant] = useState<EntryVariant>('single');
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [state, setState] = useState<PrototypeState>(JOURNEY[0].state);

  function goToStep(index: number) {
    setStepIndex(index);
    setState(JOURNEY[index].state);
  }

  function openPanel(panel: PanelKey) {
    setState((current) => ({
      ...current,
      panel: current.panel === panel ? null : panel,
      highlight: null,
      openArtifactId: null,
    }));
  }

  function openSource(sourceId: string) {
    setState((current) => ({
      ...current,
      panel: 'context',
      openSourceId: sourceId,
      openArtifactId: null,
      highlight: null,
    }));
  }

  function openArtifact(artifactId: string) {
    setState((current) => ({
      ...current,
      panel: 'results',
      openArtifactId: artifactId,
      openSourceId: null,
      highlight: null,
    }));
  }

  return (
    <AppLayout>
      <div className="flex h-full min-h-0 flex-col">
        <JourneyBar
          stepIndex={stepIndex}
          variant={variant}
          onStepChange={goToStep}
          onVariantChange={setVariant}
        />
        <div className="relative min-h-0 flex-1">
          {state.view === 'new' ? (
            <NewChatView />
          ) : (
            <PrototypeChatLayout
              resetKey={stepIndex}
              chatHeader={
                <ContentAreaHeader
                  breadcrumbs={[
                    {
                      label:
                        state.scope === 'project'
                          ? 'Stadtentwicklung Innenstadt'
                          : 'Chats',
                      href: '/chats',
                    },
                    { label: 'Ratsvorlage Stellplatzsatzung' },
                  ]}
                  action={
                    <div className="flex items-center gap-1">
                      <EntryControls
                        variant={variant}
                        contextCount={state.contextIds.length}
                        resultCount={state.artifactIds.length}
                        activePanel={state.panel}
                        highlight={state.highlight}
                        onOpen={openPanel}
                        onClose={() =>
                          setState((current) => ({ ...current, panel: null }))
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Weitere Aktionen"
                      >
                        <MoreVertical />
                      </Button>
                    </div>
                  }
                />
              }
              chatContent={
                <PrototypeTranscript
                  transcriptIds={state.transcriptIds}
                  onOpenContext={() => openPanel('context')}
                  onOpenArtifact={openArtifact}
                  onOpenSource={openSource}
                />
              }
              chatInput={<PrototypeInput pendingIds={state.pendingIds} />}
              sidePanel={
                state.panel ? (
                  <PrototypeSidePanel
                    panel={state.panel}
                    contextIds={state.contextIds}
                    processingIds={state.processingIds}
                    artifactIds={state.artifactIds}
                    openArtifactId={state.openArtifactId}
                    openSourceId={state.openSourceId}
                    onPanelChange={(panel) =>
                      setState((current) => ({
                        ...current,
                        panel,
                        openArtifactId: null,
                      }))
                    }
                    onOpenArtifact={openArtifact}
                    onBackToResults={() =>
                      setState((current) => ({
                        ...current,
                        openArtifactId: null,
                      }))
                    }
                    onExpandSource={() =>
                      setExpandedSourceId(state.openSourceId)
                    }
                    onBackToContext={() =>
                      setState((current) => ({
                        ...current,
                        openSourceId: null,
                      }))
                    }
                    onClose={() =>
                      setState((current) => ({ ...current, panel: null }))
                    }
                  />
                ) : undefined
              }
            />
          )}
        </div>
      </div>
      <SourceDialog
        sourceId={expandedSourceId}
        onClose={() => setExpandedSourceId(null)}
      />
    </AppLayout>
  );
}
