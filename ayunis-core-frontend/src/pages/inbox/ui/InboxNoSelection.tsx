import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';

export default function InboxNoSelection() {
  const { t } = useTranslation('inbox');
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <Inbox className="size-6" aria-hidden />
      {t('detail.noSelection')}
    </div>
  );
}
