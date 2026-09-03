import { ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { ScrollArea } from '@ayunis/ui/components/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { showInfo } from '@/shared/lib/toast';
import {
  ALL_SOURCE_HITS,
  CONTEXT_ITEMS,
  DOCUMENTS_BY_KNOWLEDGE_BASE,
  isPaginated,
  type ContextItem,
  type SourceHit,
} from '@/pages/chat-context-prototype/model/mock';
import { groupSourceHits } from '@/pages/chat-context-prototype/model/source-groups';
import { SourceKindIcon } from '@/pages/chat-context-prototype/ui/SourceKindIcon';

interface ContextDetailBodyProps {
  contextId: string;
  onOpenDocument: (documentId: string) => void;
}

export function ContextDetailBody({
  contextId,
  onOpenDocument,
}: Readonly<ContextDetailBodyProps>) {
  const item = CONTEXT_ITEMS[contextId];
  const documents = groupSourceHits(
    DOCUMENTS_BY_KNOWLEDGE_BASE[contextId] ?? [],
  ).map((group) => group.firstHitId);
  const label = item.kind === 'skill' ? 'Zur Fähigkeit' : 'Zur Detailseite';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 px-5 py-3">
        <h3 className="min-w-0 truncate text-sm font-medium">{item.name}</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={label}
              onClick={() => showInfo(`Detailseite von „${item.name}“`)}
            >
              <ExternalLink />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-5">
          {item.kind === 'skill' && <SkillSections item={item} />}
          {item.kind !== 'skill' && item.purpose && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {item.purpose}
            </p>
          )}
          {documents.length > 0 && (
            <Section
              title={`Inhalt · ${documents.length} ${
                documents.length === 1 ? 'Eintrag' : 'Einträge'
              }`}
            >
              <ItemGroup>
                {documents.map((documentId) => (
                  <DocumentRow
                    key={documentId}
                    documentId={documentId}
                    onOpen={onOpenDocument}
                  />
                ))}
              </ItemGroup>
            </Section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function SkillSections({ item }: Readonly<{ item: ContextItem }>) {
  return (
    <>
      <Section title="Auslöser">
        <p className="text-sm leading-relaxed">{item.detail}</p>
      </Section>
      {item.instructions && (
        <Section title="Detaillierte Anweisungen">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {item.instructions}
          </p>
        </Section>
      )}
      <NameList title="Wissenssammlungen" names={item.attachedKnowledge} />
      <NameList title="Dateien" names={item.attachedFiles} />
      <NameList title="Integrationen" names={item.attachedIntegrations} />
    </>
  );
}

function NameList({
  title,
  names,
}: Readonly<{ title: string; names?: string[] }>) {
  if (!names || names.length === 0) return null;
  return (
    <Section title={title}>
      <ul className="flex flex-col gap-1">
        {names.map((name) => (
          <li key={name} className="text-sm">
            {name}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Section({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="flex flex-col gap-1.5">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      {children}
    </section>
  );
}

function DocumentRow({
  documentId,
  onOpen,
}: Readonly<{ documentId: string; onOpen: (documentId: string) => void }>) {
  const hit = ALL_SOURCE_HITS[documentId];
  return (
    <Item
      asChild
      size="sm"
      className="group -mx-2 cursor-pointer px-2 py-2 text-left hover:bg-accent"
    >
      <button type="button" onClick={() => onOpen(documentId)}>
        <ItemMedia className="text-muted-foreground [&_svg]:size-4">
          <SourceKindIcon hit={hit} />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{hit.title}</ItemTitle>
          <ItemDescription>{sourceMeta(hit)}</ItemDescription>
        </ItemContent>
        <ItemActions>
          <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </ItemActions>
      </button>
    </Item>
  );
}

function sourceMeta(hit: SourceHit): string {
  if (hit.status === 'processing') return 'Wird verarbeitet';
  if (hit.status === 'failed') return 'Verarbeitung fehlgeschlagen';
  if (hit.kind === 'web') return hit.siteName;
  if (isPaginated(hit)) return `${hit.pageCount} Seiten`;
  return hit.location;
}
