import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Loader2 } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ayunis/ui/components/collapsible';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { cn } from '@ayunis/ui/lib/cn';
import {
  ALL_SOURCE_HITS,
  CONTEXT_ITEMS,
  DOCUMENTS_BY_KNOWLEDGE_BASE,
  KNOWLEDGE_BASE_IDS,
  STANDBY_SKILLS,
  type ContextItem,
} from '@/pages/chat-context-prototype/model/mock';
import { ORIGIN_LABELS } from '@/pages/chat-context-prototype/model/origin-groups';
import { ContextKindIcon } from '@/pages/chat-context-prototype/ui/context-icons';

interface ContextPanelBodyProps {
  contextIds: string[];
  processingIds: string[];
  openDocumentId: string | null;
  onOpenDetail: (contextId: string) => void;
  onOpenDocument: (documentId: string) => void;
}

export function ContextPanelBody({
  contextIds,
  processingIds,
  openDocumentId,
  onOpenDetail,
  onOpenDocument,
}: Readonly<ContextPanelBodyProps>) {
  const items = contextIds.map((id) => CONTEXT_ITEMS[id]);
  const usedSkills = items.filter((item) => item.kind === 'skill');
  const chatFiles = items.filter((item) => item.kind === 'file');
  const integrations = items.filter((item) => item.kind === 'integration');

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <SectionLabel>Fähigkeiten</SectionLabel>
        <ItemGroup>
          {usedSkills.map((item) => (
            <ContextRow
              key={item.id}
              item={item}
              isProcessing={false}
              onOpen={() => onOpenDetail(item.id)}
            />
          ))}
        </ItemGroup>
        <StandbySkills names={STANDBY_SKILLS} />
      </section>

      <section className="flex flex-col gap-1">
        <SectionLabel>Wissen</SectionLabel>
        <div className="flex flex-col">
          {KNOWLEDGE_BASE_IDS.map((id) => (
            <KnowledgeBaseNode
              key={id}
              knowledgeBaseId={id}
              openDocumentId={openDocumentId}
              onOpenDocument={onOpenDocument}
            />
          ))}
        </div>
        {chatFiles.length > 0 && (
          <ItemGroup>
            {chatFiles.map((item) => (
              <ContextRow
                key={item.id}
                item={item}
                isProcessing={processingIds.includes(item.id)}
                onOpen={() => onOpenDetail(item.id)}
              />
            ))}
          </ItemGroup>
        )}
      </section>

      {integrations.length > 0 && (
        <section className="flex flex-col gap-1">
          <SectionLabel>Integrationen</SectionLabel>
          <ItemGroup>
            {integrations.map((item) => (
              <ContextRow
                key={item.id}
                item={item}
                isProcessing={false}
                onOpen={() => onOpenDetail(item.id)}
              />
            ))}
          </ItemGroup>
        </section>
      )}
    </div>
  );
}

function SectionLabel({ children }: Readonly<{ children: string }>) {
  return (
    <h3 className="text-xs font-medium text-muted-foreground">{children}</h3>
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
      <CollapsibleTrigger className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent">
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
        <div className="ml-3 flex flex-col border-l pl-3">
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
        '-mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent',
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

function StandbySkills({ names }: Readonly<{ names: string[] }>) {
  const [isOpen, setIsOpen] = useState(false);
  if (names.length === 0) return null;
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <ChevronDown
          className={cn(
            'size-3.5 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
        {names.length} weitere stehen bereit
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ItemGroup className="opacity-70">
          {names.map((name) => (
            <Item key={name} size="sm" className="px-0 py-1.5">
              <ItemMedia className="text-muted-foreground [&_svg]:size-4">
                <ContextKindIcon kind="skill" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="font-normal">{name}</ItemTitle>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ContextRow({
  item,
  isProcessing,
  onOpen,
}: Readonly<{
  item: ContextItem;
  isProcessing: boolean;
  onOpen: () => void;
}>) {
  const originLabel = ORIGIN_LABELS[item.origin];
  return (
    <Item
      asChild
      size="sm"
      className="-mx-2 cursor-pointer px-2 py-2 text-left hover:bg-accent"
    >
      <button type="button" onClick={onOpen}>
        <ItemMedia
          className={cn(
            '[&_svg]:size-4',
            item.kind === 'skill' ? 'text-brand' : 'text-muted-foreground',
          )}
        >
          {isProcessing ? (
            <Loader2 className="animate-spin" />
          ) : (
            <ContextKindIcon kind={item.kind} />
          )}
        </ItemMedia>
        <ItemContent>
          <ItemTitle className={cn(isProcessing && 'text-muted-foreground')}>
            {item.name}
          </ItemTitle>
        </ItemContent>
        {(isProcessing || originLabel) && (
          <ItemActions className="text-xs text-muted-foreground">
            {isProcessing ? 'Wird verarbeitet' : originLabel}
          </ItemActions>
        )}
      </button>
    </Item>
  );
}
