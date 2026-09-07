import type { ComponentProps, Ref } from 'react';
import type { WorkspaceContextResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { ArtifactListSidePanel } from './ArtifactListSidePanel';
import { ArtifactSidePanel } from './ArtifactSidePanel';
import {
  WorkspaceContextSidePanel,
  type WorkspaceContextPanel,
} from './WorkspaceContextSidePanel';

interface ChatSidePanelProps {
  readonly threadId: string;
  readonly artifactListOpen: boolean;
  readonly artifactDetailOpen: boolean;
  readonly artifactPanelRef: Ref<ArtifactPanelHandle>;
  readonly artifactPanelProps: ComponentProps<typeof ArtifactSidePanel>;
  readonly onSelectArtifact: (artifactId: string) => void;
  readonly workspaceContext?: WorkspaceContextResponseDto;
  readonly workspacePanel: WorkspaceContextPanel | null;
  readonly onCloseWorkspacePanel: () => void;
}

export function ChatSidePanel({
  threadId,
  artifactListOpen,
  artifactDetailOpen,
  artifactPanelRef,
  artifactPanelProps,
  onSelectArtifact,
  workspaceContext,
  workspacePanel,
  onCloseWorkspacePanel,
}: Readonly<ChatSidePanelProps>) {
  if (artifactListOpen) {
    return (
      <ArtifactListSidePanel
        threadId={threadId}
        onSelect={onSelectArtifact}
        onClose={artifactPanelProps.onClose}
      />
    );
  }
  if (artifactDetailOpen) {
    return <ArtifactSidePanel ref={artifactPanelRef} {...artifactPanelProps} />;
  }
  if (workspacePanel && workspaceContext) {
    return (
      <WorkspaceContextSidePanel
        context={workspaceContext}
        panel={workspacePanel}
        onClose={onCloseWorkspacePanel}
      />
    );
  }
  return null;
}
