import { Badge } from '@ayunis/ui/components/badge';
import { useTranslation } from 'react-i18next';

export function RequestCountBadge({
  count,
  testId,
}: Readonly<{ count: number; testId?: string }>) {
  const { t } = useTranslation('resource-handover');
  if (count === 0) {
    return (
      <Badge variant="secondary" data-testid={testId}>
        0
      </Badge>
    );
  }
  return (
    <Badge
      aria-label={t('requests.count', { count })}
      className="border-transparent bg-brand text-brand-foreground"
      data-testid={testId}
    >
      {count}
    </Badge>
  );
}
