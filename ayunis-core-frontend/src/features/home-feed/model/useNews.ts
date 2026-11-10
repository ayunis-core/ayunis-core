import { useMemo } from 'react';
import { useNotificationsControllerFindAll } from '@/shared/api/generated/ayunisCoreAPI';
import { useIsFeatureEnabled } from '@/features/feature-toggles';
import {
  useReadOverrides,
  useSampleDataSetting,
} from '@/shared/lib/prototype-settings';
import { buildSampleNews, type NewsEntry } from './sample-news';

const SAMPLE_READ_BY_DEFAULT = new Set(['sample-news-4']);

export interface NewsItem extends NewsEntry {
  isUnread: boolean;
}

export function useNews(): NewsItem[] {
  const [useSampleData] = useSampleDataSetting();
  const routinesEnabled = useIsFeatureEnabled('routinesEnabled');
  const { resolveUnread } = useReadOverrides();
  const { data } = useNotificationsControllerFindAll(
    { limit: 20, offset: 0, type: 'release_note' },
    { query: { enabled: routinesEnabled && !useSampleData } },
  );
  return useMemo(() => {
    if (useSampleData) {
      return buildSampleNews().map((entry) => ({
        ...entry,
        isUnread: resolveUnread(
          entry.id,
          !SAMPLE_READ_BY_DEFAULT.has(entry.id),
        ),
      }));
    }
    return (data?.data ?? []).map((notification) => ({
      id: notification.id,
      category: 'product' as const,
      title: notification.headline,
      summary: notification.subheadline ?? '',
      body: notification.body,
      date: notification.createdAt,
      isUnread: resolveUnread(notification.id, notification.readAt === null),
      cover: { tone: 'violet', icon: 'routine' },
      questions: [
        'Was genau ist neu?',
        'Für wen ist das gedacht?',
        'Wie probiere ich es aus?',
      ],
    }));
  }, [useSampleData, data, resolveUnread]);
}
