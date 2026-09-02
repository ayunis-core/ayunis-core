import type { ReactNode } from 'react';
import { ChevronLeft, FileText, X } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import { ScrollArea } from '@ayunis/ui/components/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ayunis/ui/components/tabs';
import { cn } from '@ayunis/ui/lib/cn';
import type {
  ContextLayout,
  PanelFrame,
  PanelKey,
} from '@/widgets/prototype-journey/model/journey';
import { ArtifactPreviewBody } from './ArtifactPreviewBody';
import { ContextDetailBody } from './ContextDetailBody';
import { ContextPanelBody } from './ContextPanelBody';
import { DocumentPreviewPane } from './DocumentPreviewPane';
import { ResultsPanelBody } from './ResultsPanelBody';
import { SourceListBody } from './SourceListBody';
import { SourcePanelBody } from './SourcePanelBody';

interface PrototypeSidePanelProps {
  panel: PanelKey;
  contextIds: string[];
  processingIds: string[];
  artifactIds: string[];
  openArtifactId: string | null;
  openSourceId: string | null;
  openContextId: string | null;
  sourceListIds: string[] | null;
  openDocumentId: string | null;
  contextLayout: ContextLayout;
  panelFrame: PanelFrame;
  onPanelChange: (panel: PanelKey) => void;
  onOpenArtifact: (artifactId: string) => void;
  onBackToResults: () => void;
  onBackToContext: () => void;
  onOpenContextDetail: (contextId: string) => void;
  onOpenSourceFromList: (sourceId: string) => void;
  onOpenDocument: (documentId: string) => void;
  onExpandSource: () => void;
  onClose: () => void;
}

export function PrototypeSidePanel(props: Readonly<PrototypeSidePanelProps>) {
  const detail = resolveDetail(props);
  return (
    <aside className="flex h-full min-h-0 animate-in flex-col overflow-hidden bg-background fade-in-0 slide-in-from-right-4 duration-200">
      {detail ? (
        <DetailView
          title={detail.title}
          onBack={detail.canGoBack ? props.onBackToContext : undefined}
          onClose={props.onClose}
        >
          {detail.body}
        </DetailView>
      ) : (
        <TabsView {...props} />
      )}
    </aside>
  );
}

function resolveDetail({
  openSourceId,
  sourceListIds,
  onOpenSourceFromList,
  onExpandSource,
}: Readonly<PrototypeSidePanelProps>): {
  title: string;
  canGoBack: boolean;
  body: ReactNode;
} | null {
  if (openSourceId) {
    return {
      title: 'Quelle',
      canGoBack: sourceListIds !== null,
      body: (
        <SourcePanelBody sourceId={openSourceId} onExpand={onExpandSource} />
      ),
    };
  }
  if (sourceListIds) {
    return {
      title: 'Quellen',
      canGoBack: false,
      body: (
        <SourceListBody
          sourceIds={sourceListIds}
          onOpenHit={onOpenSourceFromList}
        />
      ),
    };
  }
  return null;
}

function PanelHeader({
  onClose,
  onBack,
  title,
  children,
}: Readonly<{
  onClose: () => void;
  onBack?: () => void;
  title?: string;
  children?: ReactNode;
}>) {
  return (
    <div
      className={`flex h-14 shrink-0 items-center gap-1 ${onBack ? 'px-2' : 'px-3'}`}
    >
      {onBack && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label="Zurück"
        >
          <ChevronLeft />
        </Button>
      )}
      {children ?? (
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {title}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        aria-label="Seitenbereich schließen"
      >
        <X />
      </Button>
    </div>
  );
}

function DetailView({
  title,
  onBack,
  onClose,
  children,
}: Readonly<{
  title: string;
  onBack?: () => void;
  onClose: () => void;
  children: ReactNode;
}>) {
  return (
    <>
      <PanelHeader title={title} onBack={onBack} onClose={onClose} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-3 pb-10 pt-1">{children}</div>
      </ScrollArea>
    </>
  );
}

function TabsView({
  panel,
  contextIds,
  processingIds,
  artifactIds,
  openArtifactId,
  openContextId,
  openDocumentId,
  contextLayout,
  panelFrame,
  onPanelChange,
  onOpenArtifact,
  onBackToResults,
  onOpenContextDetail,
  onOpenDocument,
  onExpandSource,
  onClose,
}: Readonly<PrototypeSidePanelProps>) {
  return (
    <Tabs
      value={panel}
      onValueChange={(value) => onPanelChange(value as PanelKey)}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <PanelHeader onClose={onClose}>
        <TabsList className="mr-auto h-8">
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
      </PanelHeader>
      <TabsContent value="results" className="min-h-0 flex-1 outline-none">
        <ScrollArea className="h-full">
          <div className="px-3 pb-10 pt-1">
            {openArtifactId ? (
              <ArtifactPreviewBody onBack={onBackToResults} />
            ) : (
              <ResultsPanelBody
                artifactIds={artifactIds}
                onOpen={onOpenArtifact}
              />
            )}
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="context" className="min-h-0 flex-1 outline-none">
        <ContextBrowser
          contextIds={contextIds}
          processingIds={processingIds}
          openDocumentId={openDocumentId}
          openContextId={openContextId}
          contextLayout={contextLayout}
          panelFrame={panelFrame}
          onOpenContextDetail={onOpenContextDetail}
          onOpenDocument={onOpenDocument}
          onExpandSource={onExpandSource}
        />
      </TabsContent>
    </Tabs>
  );
}

function ContextBrowser({
  contextIds,
  processingIds,
  openDocumentId,
  openContextId,
  contextLayout,
  panelFrame,
  onOpenContextDetail,
  onOpenDocument,
  onExpandSource,
}: Readonly<
  Pick<
    PrototypeSidePanelProps,
    | 'contextIds'
    | 'processingIds'
    | 'openDocumentId'
    | 'openContextId'
    | 'contextLayout'
    | 'panelFrame'
    | 'onOpenContextDetail'
    | 'onOpenDocument'
    | 'onExpandSource'
  >
>) {
  const list = (
    <ContextPanelBody
      contextIds={contextIds}
      processingIds={processingIds}
      openDocumentId={openDocumentId}
      openContextId={openContextId}
      contextLayout={contextLayout}
      onOpenDetail={onOpenContextDetail}
      onOpenDocument={onOpenDocument}
    />
  );

  const selection = openDocumentId ?? openContextId;
  if (!selection && contextLayout !== 'split') {
    return (
      <ScrollArea className="h-full">
        <div className="px-3 pb-10 pt-1">{list}</div>
      </ScrollArea>
    );
  }

  return (
    <div className="flex h-full min-h-0 gap-3 px-3 pb-3">
      <ScrollArea className="h-full w-72 shrink-0 [&>[data-slot=scroll-area-viewport]>div]:!block">
        <div className="w-full min-w-0 pb-6 pr-3 pt-2">{list}</div>
      </ScrollArea>
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
          panelFrame === 'fill' && 'rounded-lg bg-muted/40',
          panelFrame === 'stroke' && 'rounded-lg border',
          panelFrame === 'divider' && 'border-l',
        )}
      >
        {openDocumentId && (
          <DocumentPreviewPane
            documentId={openDocumentId}
            onExpand={onExpandSource}
          />
        )}
        {!openDocumentId && openContextId && (
          <ScrollArea className="h-full">
            <div className={cn(panelFrame === 'divider' ? 'py-4 pl-5' : 'p-5')}>
              <ContextDetailBody
                contextId={openContextId}
                onOpenDocument={onOpenDocument}
              />
            </div>
          </ScrollArea>
        )}
        {!selection && (
          <div className="flex h-full items-center justify-center p-5">
            <Empty>
              <EmptyMedia variant="icon">
                <FileText />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Nichts ausgewählt</EmptyTitle>
                <EmptyDescription>
                  Wählen Sie links eine Fähigkeit oder ein Dokument, um es hier
                  zu lesen.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </div>
    </div>
  );
}
