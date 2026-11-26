import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';
import { emptyInboxMessages } from '@/pages/inbox/model/empty-inbox-messages';

function pickMessage() {
  // eslint-disable-next-line sonarjs/pseudo-random -- Random empty-state copy for UI variety, not security-sensitive
  const index = Math.floor(Math.random() * emptyInboxMessages.length);
  return emptyInboxMessages[index];
}

interface InboxEmptyProps {
  showRead: boolean;
}

export function InboxEmpty({ showRead }: Readonly<InboxEmptyProps>) {
  const { t, i18n } = useTranslation('inbox');
  const [message] = useState(pickMessage);

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center"
      data-testid="inbox-empty-state"
    >
      <Inbox className="size-8 text-muted-foreground" aria-hidden />
      <h2 className="max-w-md text-balance text-xl font-bold">
        {i18n.language === 'en' ? message.en : message.de}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t(
          showRead ? 'emptyState.description' : 'emptyState.unreadDescription',
        )}
      </p>
    </div>
  );
}
