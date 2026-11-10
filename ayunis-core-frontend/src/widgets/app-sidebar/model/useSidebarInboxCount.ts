import { useHomeFeed } from '@/features/home-feed';
import { useUnreadNotificationCount } from '@/features/notifications';
import { useSampleDataSetting } from '@/shared/lib/prototype-settings';

export function useSidebarInboxCount(): number {
  const [useSampleData] = useSampleDataSetting();
  const feed = useHomeFeed(useSampleData);
  const { unreadCount } = useUnreadNotificationCount();
  return useSampleData
    ? feed.unreadRoutineCount + feed.unreadNewsCount
    : unreadCount;
}
