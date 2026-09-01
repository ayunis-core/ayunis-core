import { X } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { ScrollArea } from '@ayunis/ui/components/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ayunis/ui/components/tabs';
import type { PanelKey } from '@/widgets/prototype-journey/model/journey';
import { ArtifactPreviewBody } from './ArtifactPreviewBody';
import { ContextPanelBody } from './ContextPanelBody';
import { ResultsPanelBody } from './ResultsPanelBody';
import { SourcePanelBody } from './SourcePanelBody';

interface PrototypeSidePanelProps {
  panel: PanelKey;
  contextIds: string[];
  processingIds: string[];
  artifactIds: string[];
  openArtifactId: string | null;
  openSourceId: string | null;
  onPanelChange: (panel: PanelKey) => void;
  onOpenArtifact: (artifactId: string) => void;
  onBackToResults: () => void;
  onBackToContext: () => void;
  onExpandSource: () => void;
  onClose: () => void;
}

export function PrototypeSidePanel({
  panel,
  contextIds,
  processingIds,
  artifactIds,
  openArtifactId,
  openSourceId,
  onPanelChange,
  onOpenArtifact,
  onBackToResults,
  onBackToContext,
  onExpandSource,
  onClose,
}: Readonly<PrototypeSidePanelProps>) {
  return (
    <aside className="flex h-full min-h-0 animate-in flex-col overflow-hidden bg-background fade-in-0 slide-in-from-right-4 duration-200">
      <Tabs
        value={panel}
        onValueChange={(value) => onPanelChange(value as PanelKey)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
          <TabsList className="h-8">
            <TabsTrigger value="results" className="text-xs">
              Ergebnisse
              {artifactIds.length > 0 && (
                <span className="text-muted-foreground">
                  {artifactIds.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="context" className="text-xs">
              Kontext
            </TabsTrigger>
          </TabsList>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Seitenbereich schließen"
          >
            <X />
          </Button>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 pb-10 pt-2">
            <TabsContent value="results">
              {openArtifactId ? (
                <ArtifactPreviewBody onBack={onBackToResults} />
              ) : (
                <ResultsPanelBody
                  artifactIds={artifactIds}
                  onOpen={onOpenArtifact}
                />
              )}
            </TabsContent>
            <TabsContent value="context">
              {openSourceId ? (
                <SourcePanelBody
                  sourceId={openSourceId}
                  onBack={onBackToContext}
                  onExpand={onExpandSource}
                />
              ) : (
                <ContextPanelBody
                  contextIds={contextIds}
                  processingIds={processingIds}
                />
              )}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </aside>
  );
}
