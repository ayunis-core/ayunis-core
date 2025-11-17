// Utils
import { useTranslation } from 'react-i18next';

export function ChartEmptyState() {
  const { t } = useTranslation('chats');

  return (
    <div className="my-2 w-full p-4 text-sm text-muted-foreground">
      {t('chat.charts.emptyState')}
    </div>
  );
}
