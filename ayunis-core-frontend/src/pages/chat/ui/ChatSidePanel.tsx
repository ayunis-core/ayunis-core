import type { ComponentProps, Ref } from 'react';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { ArtifactListSidePanel } from './ArtifactListSidePanel';
import { ArtifactSidePanel } from './ArtifactSidePanel';

interface ChatSidePanelProps {
  readonly threadId: string;
  readonly artifactListOpen: boolean;
  readonly artifactDetailOpen: boolean;
  readonly artifactPanelRef: Ref<ArtifactPanelHandle>;
  readonly artifactPanelProps: ComponentProps<typeof ArtifactSidePanel>;
  readonly onSelectArtifact: (artifactId: string) => void;
}

export function ChatSidePanel({
  threadId,
  artifactListOpen,
  artifactDetailOpen,
  artifactPanelRef,
  artifactPanelProps,
  onSelectArtifact,
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
  return null;
}
