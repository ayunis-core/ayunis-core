import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import AppLayout from '@/layouts/app-layout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import {
  JOURNEY,
  type PanelKey,
  type PrototypeState,
} from '@/widgets/prototype-journey/model/journey';
import { useJourneySearch } from '@/widgets/prototype-journey';
import { EntryControls } from './EntryControls';
import { PrototypeChatInput } from './PrototypeChatInput';
import { PrototypeChatLayout } from './PrototypeChatLayout';
import { PrototypeNewChat } from './PrototypeNewChat';
import { PrototypeSidePanel } from './PrototypeSidePanel';
import { SourceDialog } from './SourceDialog';
import { PrototypeTranscript } from './PrototypeTranscript';

export function ChatContextPrototypePage() {
  const { step: stepIndex, entry: variant } = useJourneySearch();
  const [appliedStep, setAppliedStep] = useState(stepIndex);
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [state, setState] = useState<PrototypeState>(JOURNEY[0].state);

  if (appliedStep !== stepIndex) {
    setAppliedStep(stepIndex);
    setState(JOURNEY[stepIndex].state);
  }

  function openPanel(panel: PanelKey) {
    setState((current) => ({
      ...current,
      panel: current.panel === panel ? null : panel,
      highlight: null,
      openArtifactId: null,
    }));
  }

  function openContextDetail(contextId: string) {
    setState((current) => ({
      ...current,
      panel: 'context',
      openContextId: contextId,
      openSourceId: null,
    }));
  }

  function openSource(sourceId: string) {
    setState((current) => ({
      ...current,
      panel: 'context',
      openSourceId: sourceId,
      openContextId: null,
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

  const overlays = (
    <>
      <SourceDialog
        sourceId={expandedSourceId}
        onClose={() => setExpandedSourceId(null)}
      />
    </>
  );

  if (state.view === 'new') {
    return (
      <>
        <PrototypeNewChat />
        {overlays}
      </>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-full min-h-0 flex-col">
        <div className="relative min-h-0 flex-1">
          <PrototypeChatLayout
            resetKey={stepIndex}
            panelSize={state.openArtifactId ? 62 : 38}
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
            chatInput={
              <PrototypeChatInput
                attachedIds={[...state.contextIds, ...state.pendingIds]}
                processingIds={state.processingIds}
                selectedSkillId={state.pendingIds.find((id) =>
                  id.startsWith('skill-'),
                )}
                selectedSkillName={
                  state.pendingIds.some((id) => id.startsWith('skill-'))
                    ? 'Ratsvorlage erstellen'
                    : undefined
                }
                onSkillRemove={() => {}}
              />
            }
            sidePanel={
              state.panel ? (
                <PrototypeSidePanel
                  panel={state.panel}
                  contextIds={state.contextIds}
                  processingIds={state.processingIds}
                  artifactIds={state.artifactIds}
                  openArtifactId={state.openArtifactId}
                  openSourceId={state.openSourceId}
                  openContextId={state.openContextId}
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
                  onExpandSource={() => setExpandedSourceId(state.openSourceId)}
                  onBackToContext={() =>
                    setState((current) => ({
                      ...current,
                      openSourceId: null,
                      openContextId: null,
                    }))
                  }
                  onOpenContextDetail={openContextDetail}
                  onClose={() =>
                    setState((current) => ({ ...current, panel: null }))
                  }
                />
              ) : undefined
            }
          />
        </div>
      </div>
      {overlays}
    </AppLayout>
  );
}
