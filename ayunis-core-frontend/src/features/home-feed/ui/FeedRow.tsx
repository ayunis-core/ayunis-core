import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import {
  formatRelative,
  type FeedItem,
} from '@/features/home-feed/model/useHomeFeed';
import { FeedIcon, FeedItemLink, UnreadDot } from './FeedLinks';

export function FeedRow({ item }: Readonly<{ item: FeedItem }>) {
  return (
    <Item size="sm" asChild>
      <FeedItemLink item={item}>
        <ItemMedia variant="icon">
          <FeedIcon kind={item.kind} />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{item.title}</ItemTitle>
          <ItemDescription>
            {item.source}
            {item.createdAt && ` · ${formatRelative(item.createdAt)}`}
          </ItemDescription>
        </ItemContent>
        {item.isUnread && (
          <ItemActions>
            <UnreadDot />
          </ItemActions>
        )}
      </FeedItemLink>
    </Item>
  );
}
