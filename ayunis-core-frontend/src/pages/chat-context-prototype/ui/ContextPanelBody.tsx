import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ayunis/ui/components/collapsible';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ayunis/ui/components/tabs';
import { cn } from '@ayunis/ui/lib/cn';
import type { ContextLayout } from '@/widgets/prototype-journey';
import {
  ALL_SOURCE_HITS,
  CONTEXT_ITEMS,
  DOCUMENTS_BY_KNOWLEDGE_BASE,
  KNOWLEDGE_BASE_IDS,
  STANDBY_SKILL_IDS,
} from '@/pages/chat-context-prototype/model/mock';
import { ContextKindIcon } from '@/pages/chat-context-prototype/ui/context-icons';

interface ContextPanelBodyProps {
  contextIds: string[];
  processingIds: string[];
  openDocumentId: string | null;
  openContextId: string | null;
  contextLayout: ContextLayout;
  onOpenDetail: (contextId: string) => void;
  onOpenDocument: (documentId: string) => void;
}

export function ContextPanelBody({
  contextIds,
  processingIds,
  openDocumentId,
  openContextId,
  contextLayout,
  onOpenDetail,
  onOpenDocument,
}: Readonly<ContextPanelBodyProps>) {
  const usedIds = contextIds.filter((id) => CONTEXT_ITEMS[id].kind === 'skill');
  const fileIds = contextIds.filter((id) => CONTEXT_ITEMS[id].kind === 'file');
  const integrationIds = contextIds.filter(
    (id) => CONTEXT_ITEMS[id].kind === 'integration',
  );

  const skills = (
    <SkillList
      usedIds={usedIds}
      openContextId={openContextId}
      isFlat={contextLayout !== 'tree'}
      onOpen={onOpenDetail}
    />
  );

  const knowledge = (
    <KnowledgeList
      fileIds={fileIds}
      processingIds={processingIds}
      openDocumentId={openDocumentId}
      openContextId={openContextId}
      onOpenDetail={onOpenDetail}
      onOpenDocument={onOpenDocument}
    />
  );

  if (contextLayout === 'tabs') {
    return (
      <Tabs defaultValue="knowledge" className="gap-3">
        <TabsList className="h-7">
          <TabsTrigger value="knowledge" className="text-xs">
            Wissen
          </TabsTrigger>
          <TabsTrigger value="skills" className="text-xs">
            Fähigkeiten
          </TabsTrigger>
        </TabsList>
        <TabsContent value="knowledge">{knowledge}</TabsContent>
        <TabsContent value="skills">{skills}</TabsContent>
      </Tabs>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <Section label="Fähigkeiten">{skills}</Section>
      <Section label="Wissen">{knowledge}</Section>
      {integrationIds.length > 0 && (
        <Section label="Integrationen">
          <div className="flex flex-col">
            {integrationIds.map((id) => (
              <ContextRow
                key={id}
                contextId={id}
                isActive={id === openContextId}
                isUsed
                onOpen={onOpenDetail}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">{label}</h3>
      {children}
    </section>
  );
}

function SkillList({
  usedIds,
  openContextId,
  isFlat,
  onOpen,
}: Readonly<{
  usedIds: string[];
  openContextId: string | null;
  isFlat: boolean;
  onOpen: (contextId: string) => void;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const used = (
    <div className="flex flex-col">
      {usedIds.map((id) => (
        <ContextRow
          key={id}
          contextId={id}
          isActive={id === openContextId}
          isUsed
          onOpen={onOpen}
        />
      ))}
    </div>
  );
  const standby = (
    <div className="flex flex-col">
      {STANDBY_SKILL_IDS.map((id) => (
        <ContextRow
          key={id}
          contextId={id}
          isActive={id === openContextId}
          isUsed={false}
          onOpen={onOpen}
        />
      ))}
    </div>
  );

  if (isFlat) {
    return (
      <div className="flex flex-col">
        {used}
        {standby}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {used}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-1 rounded-md px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <ChevronDown
            className={cn(
              'size-3.5 transition-transform',
              isOpen && 'rotate-180',
            )}
          />
          {STANDBY_SKILL_IDS.length} weitere stehen bereit
        </CollapsibleTrigger>
        <CollapsibleContent>{standby}</CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function KnowledgeList({
  fileIds,
  processingIds,
  openDocumentId,
  openContextId,
  onOpenDetail,
  onOpenDocument,
}: Readonly<{
  fileIds: string[];
  processingIds: string[];
  openDocumentId: string | null;
  openContextId: string | null;
  onOpenDetail: (contextId: string) => void;
  onOpenDocument: (documentId: string) => void;
}>) {
  return (
    <div className="flex flex-col">
      {KNOWLEDGE_BASE_IDS.map((id) => (
        <KnowledgeBaseNode
          key={id}
          knowledgeBaseId={id}
          openDocumentId={openDocumentId}
          onOpenDocument={onOpenDocument}
        />
      ))}
      {fileIds.map((id) => (
        <ContextRow
          key={id}
          contextId={id}
          isActive={id === openContextId}
          isUsed={!processingIds.includes(id)}
          onOpen={onOpenDetail}
        />
      ))}
    </div>
  );
}

function KnowledgeBaseNode({
  knowledgeBaseId,
  openDocumentId,
  onOpenDocument,
}: Readonly<{
  knowledgeBaseId: string;
  openDocumentId: string | null;
  onOpenDocument: (documentId: string) => void;
}>) {
  const base = CONTEXT_ITEMS[knowledgeBaseId];
  const documents = DOCUMENTS_BY_KNOWLEDGE_BASE[knowledgeBaseId] ?? [];
  const [isOpen, setIsOpen] = useState(
    documents.includes(openDocumentId ?? ''),
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-accent">
        {isOpen ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="shrink-0 text-muted-foreground [&_svg]:size-4">
          <ContextKindIcon kind="knowledgeBase" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{base.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {documents.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mb-1 ml-3 flex flex-col gap-0.5 border-l pl-3">
          {documents.map((documentId) => (
            <DocumentNode
              key={documentId}
              documentId={documentId}
              isActive={documentId === openDocumentId}
              onOpen={onOpenDocument}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function DocumentNode({
  documentId,
  isActive,
  onOpen,
}: Readonly<{
  documentId: string;
  isActive: boolean;
  onOpen: (documentId: string) => void;
}>) {
  const hit = ALL_SOURCE_HITS[documentId];
  return (
    <button
      type="button"
      onClick={() => onOpen(documentId)}
      className={cn(
        '-mx-2 flex items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent',
        isActive && 'bg-accent',
      )}
    >
      <span className="shrink-0 text-muted-foreground [&_svg]:size-3.5">
        <FileText />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{hit.title}</span>
    </button>
  );
}

function ContextRow({
  contextId,
  isActive,
  isUsed,
  onOpen,
}: Readonly<{
  contextId: string;
  isActive: boolean;
  isUsed: boolean;
  onOpen: (contextId: string) => void;
}>) {
  const item = CONTEXT_ITEMS[contextId];
  return (
    <button
      type="button"
      onClick={() => onOpen(contextId)}
      className={cn(
        '-mx-2 flex items-center gap-2.5 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-accent',
        isActive && 'bg-accent',
      )}
    >
      <span
        className={cn(
          'shrink-0 [&_svg]:size-4',
          isUsed && item.kind === 'skill'
            ? 'text-brand'
            : 'text-muted-foreground',
        )}
      >
        <ContextKindIcon kind={item.kind} />
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm',
          !isUsed && 'text-muted-foreground',
        )}
      >
        {item.name}
      </span>
      {isUsed && item.kind === 'skill' && (
        <span className="shrink-0 text-xs text-muted-foreground">
          Verwendet
        </span>
      )}
    </button>
  );
}
