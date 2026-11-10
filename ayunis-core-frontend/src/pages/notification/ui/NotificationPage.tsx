import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { NotificationDetail } from '@/widgets/notification-detail';
import { useMarkNotificationRead } from '@/features/notifications';
import type { NotificationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useNotification } from '@/pages/notification/api/useNotification';

interface NotificationPageProps {
  notification: NotificationResponseDto;
  selectedModelId?: string;
  isEmbeddingModelEnabled: boolean;
}

export default function NotificationPage(
  props: Readonly<NotificationPageProps>,
) {
  const { t } = useTranslation('inbox');
  const notification =
    useNotification(props.notification.id).notification ?? props.notification;
  const { mutate: markRead } = useMarkNotificationRead();
  const isUnread = notification.readAt === null;

  useEffect(() => {
    if (isUnread) markRead(notification.id);
  }, [isUnread, markRead, notification.id]);

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: t('page.title'), href: '/inbox' },
              { label: notification.headline },
            ]}
          />
        }
        contentArea={
          <NotificationDetail
            notification={notification}
            selectedModelId={props.selectedModelId}
            isEmbeddingModelEnabled={props.isEmbeddingModelEnabled}
          />
        }
      />
    </AppLayout>
  );
}
