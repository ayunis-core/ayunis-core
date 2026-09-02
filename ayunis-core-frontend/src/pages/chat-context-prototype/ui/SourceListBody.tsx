import { ChevronRight } from 'lucide-react';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { ALL_SOURCE_HITS } from '@/pages/chat-context-prototype/model/mock';
import {
  groupSourceHits,
  stellenLabel,
} from '@/pages/chat-context-prototype/model/source-groups';
import { SourceKindIcon } from '@/pages/chat-context-prototype/ui/SourceKindIcon';

interface SourceListBodyProps {
  sourceIds: string[];
  onOpenHit: (sourceId: string) => void;
}

export function SourceListBody({
  sourceIds,
  onOpenHit,
}: Readonly<SourceListBodyProps>) {
  const groups = groupSourceHits(sourceIds);
  return (
    <div className="flex animate-in flex-col gap-3 fade-in-0 slide-in-from-right-2 duration-200">
      <span className="text-xs text-muted-foreground">Zu dieser Antwort</span>
      <ItemGroup>
        {groups.map((group) => {
          const hit = ALL_SOURCE_HITS[group.firstHitId];
          return (
            <Item
              key={group.key}
              asChild
              size="sm"
              className="group -mx-2 cursor-pointer px-2 py-2 text-left hover:bg-accent"
            >
              <button type="button" onClick={() => onOpenHit(group.firstHitId)}>
                <ItemMedia className="text-muted-foreground [&_svg]:size-4">
                  <SourceKindIcon hit={hit} />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{hit.title}</ItemTitle>
                  <ItemDescription>
                    {hit.kind === 'web'
                      ? hit.siteName
                      : stellenLabel(group.hitIds.length)}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </ItemActions>
              </button>
            </Item>
          );
        })}
      </ItemGroup>
    </div>
  );
}
