import { ChevronRight, Globe, Quote } from 'lucide-react';
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

interface SourceGroup {
  key: string;
  title: string;
  detail: string;
  isWeb: boolean;
  firstHitId: string;
}

function groupHits(sourceIds: string[]): SourceGroup[] {
  const groups = new Map<string, SourceGroup & { count: number }>();
  for (const id of sourceIds) {
    const hit = ALL_SOURCE_HITS[id];
    const key = hit.kind === 'web' ? hit.siteName : hit.title;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.detail = `${existing.count} Stellen`;
      continue;
    }
    groups.set(key, {
      key,
      title: hit.title,
      detail: hit.kind === 'web' ? hit.siteName : '1 Stelle',
      isWeb: hit.kind === 'web',
      firstHitId: id,
      count: 1,
    });
  }
  return [...groups.values()];
}

interface SourceListBodyProps {
  sourceIds: string[];
  onOpenHit: (sourceId: string) => void;
}

export function SourceListBody({
  sourceIds,
  onOpenHit,
}: Readonly<SourceListBodyProps>) {
  const groups = groupHits(sourceIds);
  return (
    <div className="flex animate-in flex-col gap-3 fade-in-0 slide-in-from-right-2 duration-200">
      <span className="text-xs text-muted-foreground">Zu dieser Antwort</span>
      <ItemGroup>
        {groups.map((group) => (
          <Item
            key={group.key}
            asChild
            size="sm"
            className="group -mx-2 cursor-pointer px-2 py-2 text-left hover:bg-accent"
          >
            <button type="button" onClick={() => onOpenHit(group.firstHitId)}>
              <ItemMedia className="text-muted-foreground [&_svg]:size-4">
                {group.isWeb ? <Globe /> : <Quote />}
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{group.title}</ItemTitle>
                <ItemDescription>{group.detail}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </ItemActions>
            </button>
          </Item>
        ))}
      </ItemGroup>
    </div>
  );
}
