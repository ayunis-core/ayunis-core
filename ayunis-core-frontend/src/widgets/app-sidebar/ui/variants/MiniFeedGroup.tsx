import { ArrowRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ayunis/ui/components/sidebar';
import {
  FeedIcon,
  FeedItemLink,
  UnreadDot,
  formatRelative,
  unreadFeedItems,
  useHomeFeed,
  type FeedItem,
} from '@/features/home-feed';
import { formatUnreadCount } from '@/features/notifications';
import { useSampleDataSetting } from '@/shared/lib/prototype-settings';
import { useSidebarInboxCount } from '@/widgets/app-sidebar/model/useSidebarInboxCount';

const MAX_ITEMS = 3;

function MiniFeedRow({ item }: Readonly<{ item: FeedItem }>) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild className="h-auto items-start py-1.5">
        <FeedItemLink item={item}>
          <FeedIcon kind={item.kind} className="mt-0.5" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate">{item.title}</span>
            <span className="truncate text-xs text-muted-foreground">
              {formatRelative(item.createdAt)}
            </span>
          </span>
          <UnreadDot className="mt-1.5" />
        </FeedItemLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function MiniFeedGroup({
  routinesEnabled,
}: Readonly<{ routinesEnabled: boolean }>) {
  const [useSampleData] = useSampleDataSetting();
  const feed = useHomeFeed(useSampleData);
  const unread = unreadFeedItems(feed);
  const countLabel = formatUnreadCount(useSidebarInboxCount());
  if (!routinesEnabled || unread.length === 0) return null;
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Neu für Sie</SidebarGroupLabel>
      <SidebarMenu>
        {unread.slice(0, MAX_ITEMS).map((item) => (
          <MiniFeedRow key={item.id} item={item} />
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="text-muted-foreground">
            <Link to="/inbox">
              <ArrowRight />
              <span>Posteingang öffnen</span>
            </Link>
          </SidebarMenuButton>
          {countLabel && <SidebarMenuBadge>{countLabel}</SidebarMenuBadge>}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
