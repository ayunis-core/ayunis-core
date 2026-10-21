import { Lock } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { useTranslation } from 'react-i18next';

export function ReadOnlyBadge() {
  const { t } = useTranslation('resource-ownership');

  return (
    <Badge variant="outline" data-testid="read-only-badge">
      <Lock />
      {t('readOnly')}
    </Badge>
  );
}
