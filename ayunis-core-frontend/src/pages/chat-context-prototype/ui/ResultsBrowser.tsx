import { FileStack } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import { ScrollArea } from '@ayunis/ui/components/scroll-area';
import type { PanelFrame } from '@/widgets/prototype-journey/model/journey';
import { ArtifactPreviewBody } from '@/pages/chat-context-prototype/ui/ArtifactPreviewBody';
import {
  PanelRail,
  PanelSurface,
} from '@/pages/chat-context-prototype/ui/PanelSurface';
import { ResultsPanelBody } from '@/pages/chat-context-prototype/ui/ResultsPanelBody';

interface ResultsBrowserProps {
  artifactIds: string[];
  openArtifactId: string | null;
  panelFrame: PanelFrame;
  onOpenArtifact: (artifactId: string) => void;
}

export function ResultsBrowser({
  artifactIds,
  openArtifactId,
  panelFrame,
  onOpenArtifact,
}: Readonly<ResultsBrowserProps>) {
  const list = (
    <ResultsPanelBody artifactIds={artifactIds} onOpen={onOpenArtifact} />
  );

  if (!openArtifactId) {
    return (
      <ScrollArea className="h-full">
        <div className="px-3 pb-10 pt-1">{list}</div>
      </ScrollArea>
    );
  }

  return (
    <div className="flex h-full min-h-0 gap-3 px-3 pb-3">
      <ScrollArea className="h-full w-72 shrink-0 [&>[data-slot=scroll-area-viewport]>div]:!block">
        <PanelRail>{list}</PanelRail>
      </ScrollArea>
      <PanelSurface frame={panelFrame}>
        {openArtifactId ? (
          <ArtifactPreviewBody />
        ) : (
          <div className="flex h-full items-center justify-center p-5">
            <Empty>
              <EmptyMedia variant="icon">
                <FileStack />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Nichts ausgewählt</EmptyTitle>
                <EmptyDescription>
                  Wählen Sie links ein Ergebnis, um es hier zu bearbeiten.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </PanelSurface>
    </div>
  );
}
