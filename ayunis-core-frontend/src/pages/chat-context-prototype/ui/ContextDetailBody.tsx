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
import { Separator } from '@ayunis/ui/components/separator';
import { showInfo } from '@/shared/lib/toast';
import {
  CONTEXT_ITEMS,
  DOCUMENTS_BY_KNOWLEDGE_BASE,
  ALL_SOURCE_HITS,
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
    <div className="flex animate-in flex-col gap-4 fade-in-0 slide-in-from-right-2 duration-200">
      <DetailHead item={item} />
      {item.purpose && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {item.purpose}
        </p>
      )}
      {item.instructions && (
        <>
          <Separator />
          <section className="flex flex-col gap-1.5">
            <h4 className="text-xs font-medium text-muted-foreground">
              Anweisung
            </h4>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {item.instructions}
            </p>
          </section>
        </>
      )}
      {documents.length > 0 && (
        <>
          <Separator />
          <section className="flex flex-col gap-1">
            <h4 className="text-xs font-medium text-muted-foreground">
              Inhalt · {documents.length} Dokumente
            </h4>
            <ItemGroup>
              {documents.map((documentId) => (
                <DocumentRow
                  key={documentId}
                  documentId={documentId}
                  onOpen={onOpenDocument}
                />
              ))}
            </ItemGroup>
          </section>
        </>
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
  );
}

function DetailHead({ item }: Readonly<{ item: ContextItem }>) {
  return (
    <div className="flex min-w-0 flex-col">
      <h3 className="text-sm font-medium">{item.name}</h3>
      <span className="text-xs text-muted-foreground">
        {KIND_LABELS[item.kind]} · {item.detail}
      </span>
    </div>
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
