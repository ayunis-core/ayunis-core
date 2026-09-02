import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ayunis/ui/components/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { cn } from '@ayunis/ui/lib/cn';
import type { ContextLayout } from '@/widgets/prototype-journey';
import {
  ALL_SOURCE_HITS,
  type SourceHit,
  CONTEXT_ITEMS,
  DOCUMENTS_BY_KNOWLEDGE_BASE,
  KNOWLEDGE_BASE_IDS,
  STANDBY_SKILL_IDS,
} from '@/pages/chat-context-prototype/model/mock';
import { groupSourceHits } from '@/pages/chat-context-prototype/model/source-groups';
import { ContextKindIcon } from '@/pages/chat-context-prototype/ui/context-icons';
import { SourceKindIcon } from '@/pages/chat-context-prototype/ui/SourceKindIcon';

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

  return (
    <div className="flex min-w-0 flex-col gap-7">
      <Section label="Fähigkeiten">{skills}</Section>
      <Section label="Wissen">{knowledge}</Section>
      {integrationIds.length > 0 && (
        <Section label="Integrationen">
          <div className="flex min-w-0 flex-col gap-0.5">
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
    <section className="flex min-w-0 flex-col gap-2">
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
    <div className="flex min-w-0 flex-col gap-0.5">
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
    <div className="flex min-w-0 flex-col gap-0.5">
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
      <div className="flex min-w-0 flex-col gap-0.5">
        {used}
        {standby}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      {used}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
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
    <div className="flex min-w-0 flex-col gap-0.5">
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
  const groups = groupSourceHits(DOCUMENTS_BY_KNOWLEDGE_BASE[knowledgeBaseId]);
  const [isOpen, setIsOpen] = useState(
    groups.some((group) => group.hitIds.includes(openDocumentId ?? '')),
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full min-w-0 items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent">
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
          {groups.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mb-1 ml-3 mt-0.5 flex min-w-0 flex-col gap-0.5 overflow-hidden border-l pl-3">
          {groups.map((group) => (
            <DocumentNode
              key={group.key}
              documentId={group.firstHitId}
              isActive={group.hitIds.includes(openDocumentId ?? '')}
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
        'flex w-full min-w-0 items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent',
        isActive && 'bg-accent',
      )}
    >
      <span
        className={cn(
          'shrink-0 [&_svg]:size-3.5',
          hit.status === 'failed'
            ? 'text-destructive'
            : 'text-muted-foreground',
        )}
      >
        <DocumentNodeIcon hit={hit} />
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm',
          hit.status === 'processing' && 'text-muted-foreground',
        )}
      >
        {hit.title}
      </span>
    </button>
  );
}

function DocumentNodeIcon({ hit }: Readonly<{ hit: SourceHit }>) {
  if (hit.status === 'processing') return <Loader2 className="animate-spin" />;
  return <SourceKindIcon hit={hit} />;
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
        'flex w-full min-w-0 items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent',
        isActive && 'bg-accent',
      )}
    >
      <span
        className={cn(
          'shrink-0 [&_svg]:size-3.5',
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
          isUsed ? 'font-medium' : 'text-muted-foreground',
        )}
      >
        {item.name}
      </span>
      {isUsed && item.kind === 'skill' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="size-1.5 shrink-0 rounded-full bg-brand" />
          </TooltipTrigger>
          <TooltipContent>In dieser Antwort verwendet</TooltipContent>
        </Tooltip>
      )}
    </button>
  );
}
