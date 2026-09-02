import { useState } from 'react';
import { ChevronDown, Library, Loader2 } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ayunis/ui/components/collapsible';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
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
import {
  CONTEXT_ITEMS,
  STANDBY_KNOWLEDGE,
  STANDBY_SKILLS,
  type ContextItem,
  type ContextKind,
} from '@/pages/chat-context-prototype/model/mock';
import { ORIGIN_LABELS } from '@/pages/chat-context-prototype/model/origin-groups';
import { ContextKindIcon } from '@/pages/chat-context-prototype/ui/context-icons';

const GROUPS: {
  kinds: ContextKind[];
  label: string;
  standby: string[];
  standbyKind: ContextKind;
}[] = [
  {
    kinds: ['skill'],
    label: 'Fähigkeiten',
    standby: STANDBY_SKILLS,
    standbyKind: 'skill',
  },
  {
    kinds: ['knowledgeBase', 'file'],
    label: 'Wissen',
    standby: STANDBY_KNOWLEDGE,
    standbyKind: 'knowledgeBase',
  },
  {
    kinds: ['integration'],
    label: 'Integrationen',
    standby: [],
    standbyKind: 'integration',
  },
];

interface ContextPanelBodyProps {
  contextIds: string[];
  processingIds: string[];
  onOpenDetail: (contextId: string) => void;
}

export function ContextPanelBody({
  contextIds,
  processingIds,
  onOpenDetail,
}: Readonly<ContextPanelBodyProps>) {
  const items = contextIds.map((id) => CONTEXT_ITEMS[id]);
  if (items.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <Library />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>Noch nichts verwendet</EmptyTitle>
          <EmptyDescription>
            Fähigkeiten und Wissen stehen bereit und erscheinen hier, sobald sie
            zu einer Antwort beitragen.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map((group) => {
        const used = items.filter((item) => group.kinds.includes(item.kind));
        if (used.length === 0 && group.standby.length === 0) return null;
        return (
          <section key={group.label} className="flex flex-col gap-1">
            <h3 className="text-xs font-medium text-muted-foreground">
              {group.label}
            </h3>
            <ItemGroup>
              {used.map((item) => (
                <ContextRow
                  key={item.id}
                  item={item}
                  isProcessing={processingIds.includes(item.id)}
                  onOpen={() => onOpenDetail(item.id)}
                />
              ))}
            </ItemGroup>
            <StandbyList names={group.standby} kind={group.standbyKind} />
          </section>
        );
      })}
    </div>
  );
}

function StandbyList({
  names,
  kind,
}: Readonly<{ names: string[]; kind: ContextKind }>) {
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
                <ContextKindIcon kind={kind} />
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
