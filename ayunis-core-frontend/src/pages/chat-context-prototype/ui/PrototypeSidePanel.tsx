import { ChevronLeft, FileText, X } from 'lucide-react';
import type { ReactNode } from 'react';
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
import type {
  ContextLayout,
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
      <div
        className={`flex h-14 shrink-0 items-center gap-1 ${onBack ? 'px-2' : 'px-4'}`}
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
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {title}
        </span>
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
        <div className="px-4 pb-10 pt-2">{children}</div>
      </ScrollArea>
    </>
  );
}

function ContextBrowser({
  contextIds,
  processingIds,
  openDocumentId,
  openContextId,
  contextLayout,
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
  if (!selection && contextLayout !== 'split') return list;

  return (
    <div className="flex gap-5">
      <div className="w-56 shrink-0 border-r pr-5">{list}</div>
      <div className="min-w-0 flex-1">
        {openDocumentId && (
          <DocumentPreviewPane
            documentId={openDocumentId}
            onExpand={onExpandSource}
          />
        )}
        {!openDocumentId && openContextId && (
          <ContextDetailBody
            contextId={openContextId}
            onOpenDocument={onOpenDocument}
          />
        )}
        {!selection && (
          <Empty>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>Nichts ausgewählt</EmptyTitle>
              <EmptyDescription>
                Wählen Sie links eine Fähigkeit oder ein Dokument, um es hier zu
                lesen.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
}

function TabsView({
  panel,
  contextIds,
  processingIds,
  artifactIds,
  openArtifactId,
  openDocumentId,
  openContextId,
  contextLayout,
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
            <ContextBrowser
              contextIds={contextIds}
              processingIds={processingIds}
              openDocumentId={openDocumentId}
              openContextId={openContextId}
              contextLayout={contextLayout}
              onOpenContextDetail={onOpenContextDetail}
              onOpenDocument={onOpenDocument}
              onExpandSource={onExpandSource}
            />
          </TabsContent>
        </div>
      </ScrollArea>
    </Tabs>
  );
}
