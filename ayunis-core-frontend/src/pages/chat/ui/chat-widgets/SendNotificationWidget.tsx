import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { cn } from '@ayunis/ui/lib/cn';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import { Markdown } from '@/widgets/markdown';
import { sentNotificationFromToolResult } from '@/pages/chat/lib/sent-notification';

interface SendNotificationParams {
  headline?: string;
  subheadline?: string;
  body?: string;
}

export default function SendNotificationWidget({
  content,
  result,
  isStreaming = false,
}: Readonly<{
  content: ToolUseMessageContent;
  result?: string;
  isStreaming?: boolean;
}>) {
  const { t } = useTranslation('chat');
  const sent = sentNotificationFromToolResult(result);
  // A call the backend rejected sent nothing; its step row stays.
  if (!isStreaming && !sent) return null;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming even if typed as required
  const params = (content.params || {}) as SendNotificationParams;

  return (
    <Item
      variant="outline"
      className={cn('my-2 w-full items-start', isStreaming && 'animate-pulse')}
      data-testid="send-notification-widget"
    >
      <ItemMedia variant="icon">
        <Inbox />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-3">
        <div className="flex flex-col gap-1">
          <ItemDescription>
            {t('chat.tools.send_notification.title')}
          </ItemDescription>
          <ItemTitle data-testid="send-notification-widget-headline">
            {params.headline}
          </ItemTitle>
          {params.subheadline && (
            <ItemDescription>{params.subheadline}</ItemDescription>
          )}
        </div>
        {params.body && (
          // Shows about the first ten lines and fades out the rest.
          <div className="max-h-60 overflow-hidden [mask-image:linear-gradient(to_bottom,black_12rem,transparent_15rem)]">
            <Markdown renderImages={false} className="text-sm">
              {params.body}
            </Markdown>
          </div>
        )}
        {sent?.notificationId && (
          <Button asChild variant="outline" size="sm" className="self-start">
            <Link
              to="/inbox/$notificationId"
              params={{ notificationId: sent.notificationId }}
              data-testid="send-notification-widget-open"
            >
              <Inbox />
              {t('chat.tools.send_notification.open')}
            </Link>
          </Button>
        )}
      </ItemContent>
    </Item>
  );
}
