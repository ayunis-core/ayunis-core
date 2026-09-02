import { ExternalLink, FileText } from 'lucide-react';
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
import { showInfo } from '@/shared/lib/toast';
import {
  ALL_SOURCE_HITS,
  CONTEXT_ITEMS,
  DOCUMENTS_BY_KNOWLEDGE_BASE,
  type ContextItem,
} from '@/pages/chat-context-prototype/model/mock';

const KIND_LABELS = {
  skill: 'Fähigkeit',
  knowledgeBase: 'Wissensdatenbank',
  file: 'Datei',
  integration: 'Integration',
};

interface ContextDetailBodyProps {
  contextId: string;
  onOpenDocument: (documentId: string) => void;
}

export function ContextDetailBody({
  contextId,
  onOpenDocument,
}: Readonly<ContextDetailBodyProps>) {
  const item = CONTEXT_ITEMS[contextId];
  const documents = DOCUMENTS_BY_KNOWLEDGE_BASE[contextId] ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b px-5 py-4">
        <h3 className="truncate text-sm font-medium">{item.name}</h3>
        <span className="text-xs text-muted-foreground">
          {KIND_LABELS[item.kind]}
        </span>
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
            <Section title={`Inhalt · ${documents.length} Dokumente`}>
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
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => showInfo(`Detailseite von „${item.name}“`)}
          >
            <ExternalLink />
            {item.kind === 'skill' ? 'Zur Fähigkeit' : 'Zur Detailseite'}
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

function SkillSections({ item }: Readonly<{ item: ContextItem }>) {
  return (
    <>
      <Section title="Auslöser">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {item.detail}
        </p>
      </Section>
      {item.purpose && (
        <Section title="Wirkung">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {item.purpose}
          </p>
        </Section>
      )}
      {item.instructions && (
        <Section title="Detaillierte Anweisungen">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {item.instructions}
          </p>
        </Section>
      )}
      <NameList title="Wissensdatenbanken" names={item.attachedKnowledge} />
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
  if (hit.kind !== 'document') return null;
  return (
    <Item
      asChild
      size="sm"
      className="group -mx-2 cursor-pointer px-2 py-2 text-left hover:bg-accent"
    >
      <button type="button" onClick={() => onOpen(documentId)}>
        <ItemMedia className="text-muted-foreground [&_svg]:size-4">
          <FileText />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{hit.title}</ItemTitle>
          <ItemDescription>{hit.pageCount} Seiten</ItemDescription>
        </ItemContent>
        <ItemActions>
          <ExternalLink className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </ItemActions>
      </button>
    </Item>
  );
}
