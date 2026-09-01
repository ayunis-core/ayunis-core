import { Loader2 } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { cn } from '@ayunis/ui/lib/cn';
import { showInfo } from '@/shared/lib/toast';
import {
  AVAILABLE_COUNTS,
  CONTEXT_ITEMS,
  type ContextItem,
  type ContextKind,
} from '@/pages/chat-context-prototype/model/mock';
import { ORIGIN_LABELS } from '@/pages/chat-context-prototype/model/origin-groups';
import { ContextKindIcon } from '@/pages/chat-context-prototype/ui/context-icons';

const GROUPS: { kinds: ContextKind[]; label: string }[] = [
  { kinds: ['skill'], label: 'Fähigkeiten' },
  { kinds: ['knowledgeBase', 'file'], label: 'Wissen' },
  { kinds: ['integration'], label: 'Integrationen' },
];

interface ContextPanelBodyProps {
  contextIds: string[];
  processingIds: string[];
}

export function ContextPanelBody({
  contextIds,
  processingIds,
}: Readonly<ContextPanelBodyProps>) {
  const items = contextIds.map((id) => CONTEXT_ITEMS[id]);
  if (items.length === 0) {
    return (
      <Empty className="gap-2">
        <EmptyHeader className="gap-2">
          <EmptyTitle>In diesem Chat wurde noch nichts geladen.</EmptyTitle>
          <EmptyDescription>
            Ayunis Core kann auf {AVAILABLE_COUNTS.skills} Fähigkeiten und{' '}
            {AVAILABLE_COUNTS.knowledgeBases} Wissensdatenbanken zugreifen.
            Verwaltet werden sie in den Reitern.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">In diesem Chat geladen</p>
      {GROUPS.map((group) => {
        const groupItems = items.filter((item) =>
          group.kinds.includes(item.kind),
        );
        if (groupItems.length === 0) return null;
        return (
          <section key={group.label} className="flex flex-col gap-1">
            <h3 className="text-xs font-medium text-muted-foreground">
              {group.label}
            </h3>
            <ItemGroup>
              {groupItems.map((item) => (
                <ContextRow
                  key={item.id}
                  item={item}
                  isProcessing={processingIds.includes(item.id)}
                />
              ))}
            </ItemGroup>
          </section>
        );
      })}
    </div>
  );
}

function ContextRow({
  item,
  isProcessing,
}: Readonly<{ item: ContextItem; isProcessing: boolean }>) {
  const originLabel = ORIGIN_LABELS[item.origin];
  return (
    <Item
      asChild
      size="sm"
      className="-mx-2 cursor-pointer px-2 py-2 hover:bg-accent"
    >
      <button
        type="button"
        onClick={() => showInfo(`Detailseite von „${item.name}“`)}
      >
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
