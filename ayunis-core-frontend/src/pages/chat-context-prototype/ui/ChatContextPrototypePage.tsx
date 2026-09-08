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
import { ALL_SOURCE_HITS } from '@/pages/chat-context-prototype/model/mock';
import { PanelToggle } from './PanelToggle';
import { PrototypeChatInput } from './PrototypeChatInput';
import { PrototypeChatLayout } from './PrototypeChatLayout';
import { PrototypeNewChat } from './PrototypeNewChat';
import { PrototypeSidePanel } from './PrototypeSidePanel';
import { SourceDialog } from './SourceDialog';
import { PrototypeTranscript } from './PrototypeTranscript';

function isWidePanel(state: PrototypeState, contextLayout: string): boolean {
  if (state.openSourceId ?? state.sourceListIds) return false;
  if (state.openArtifactId ?? state.openDocumentId) return true;
  if (state.panel !== 'context') return false;
  return contextLayout === 'split' || state.openContextId !== null;
}

export function ChatContextPrototypePage() {
  const {
    step: stepIndex,
    layout: contextLayout,
    frame: panelFrame,
    nav: detailMode,
  } = useJourneySearch();
  const [appliedStep, setAppliedStep] = useState(stepIndex);
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [state, setState] = useState<PrototypeState>(JOURNEY[stepIndex].state);

  if (appliedStep !== stepIndex) {
    setAppliedStep(stepIndex);
    setState(JOURNEY[stepIndex].state);
  }

  function openPanel(panel: PanelKey) {
    setState((current) => {
      const hasDetail =
        current.openSourceId !== null ||
        current.sourceListIds !== null ||
        current.openContextId !== null ||
        current.openArtifactId !== null;
      if (hasDetail) {
        return {
          ...current,
          panel,
          highlight: null,
          openArtifactId: null,
          openSourceId: null,
          openContextId: null,
          sourceListIds: null,
          openDocumentId: null,
        };
      }
      return {
        ...current,
        panel: current.panel === panel ? null : panel,
        highlight: null,
      };
    });
  }

  function togglePanel() {
    setState((current) => {
      if (current.panel) {
        return { ...current, panel: null, highlight: null };
      }
      return {
        ...current,
        panel: current.artifactIds.length > 0 ? 'results' : 'context',
        highlight: null,
      };
    });
  }

  function withDetail(
    current: PrototypeState,
    patch: Partial<PrototypeState>,
  ): PrototypeState {
    return {
      ...current,
      highlight: null,
      openArtifactId: null,
      openSourceId: null,
      openContextId: null,
      openDocumentId: null,
      citedDocumentId: null,
      sourceListIds: null,
      ...patch,
    };
  }

  function openContextDetail(contextId: string) {
    setState((current) =>
      withDetail(current, { panel: 'context', openContextId: contextId }),
    );
  }

  function goBackInContext() {
    setState((current) => {
      if (current.openSourceId && current.sourceListIds) {
        return { ...current, openSourceId: null };
      }
      return {
        ...current,
        openSourceId: null,
        openContextId: null,
        sourceListIds: null,
        openDocumentId: null,
        citedDocumentId: null,
      };
    });
  }

  function openSourceList(sourceIds: string[]) {
    setState((current) =>
      withDetail(current, { panel: 'context', sourceListIds: sourceIds }),
    );
  }

  function openSource(sourceId: string) {
    const hit = ALL_SOURCE_HITS[sourceId];
    setState((current) => {
      if (hit.kind === 'document') {
        return withDetail(current, {
          panel: 'context',
          openDocumentId: sourceId,
          citedDocumentId: sourceId,
        });
      }
      const next = withDetail(current, {
        panel: 'context',
        openSourceId: sourceId,
      });
      return current.sourceListIds
        ? { ...next, sourceListIds: current.sourceListIds }
        : next;
    });
  }

  function openArtifact(artifactId: string) {
    setState((current) =>
      withDetail(current, { panel: 'results', openArtifactId: artifactId }),
    );
  }

  const panelToggle = (
    <PanelToggle
      resultCount={state.artifactIds.length}
      highlight={state.highlight !== null}
      onToggle={togglePanel}
    />
  );

  const overlays = (
    <>
      <SourceDialog
        sourceId={expandedSourceId}
        showCitation={expandedSourceId === state.citedDocumentId}
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
        <div className="relative -mx-4 -mb-4 min-h-0 flex-1">
          <PrototypeChatLayout
            resetKey={stepIndex}
            panelSize={isWidePanel(state, contextLayout) ? 65 : 38}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Weitere Aktionen"
                    >
                      <MoreVertical />
                    </Button>
                    {!state.panel && panelToggle}
                  </div>
                }
              />
            }
            chatContent={
              <PrototypeTranscript
                transcriptIds={state.transcriptIds}
                onOpenContext={(contextId) =>
                  contextId
                    ? openContextDetail(contextId)
                    : openPanel('context')
                }
                onOpenArtifact={openArtifact}
                onOpenSource={openSource}
                onOpenSourceList={openSourceList}
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
                  sourceListIds={state.sourceListIds}
                  openDocumentId={state.openDocumentId}
                  isDocumentCited={
                    state.openDocumentId !== null &&
                    state.openDocumentId === state.citedDocumentId
                  }
                  contextLayout={contextLayout}
                  panelFrame={panelFrame}
                  detailMode={detailMode}
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
                    setExpandedSourceId(
                      state.openDocumentId ?? state.openSourceId,
                    )
                  }
                  onBackToContext={goBackInContext}
                  onOpenContextDetail={openContextDetail}
                  onOpenDocument={(documentId) =>
                    setState((current) =>
                      withDetail(current, {
                        panel: 'context',
                        openDocumentId: documentId,
                      }),
                    )
                  }
                  onOpenSourceFromList={openSource}
                  panelToggle={panelToggle}
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
