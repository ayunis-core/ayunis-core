import { Badge } from '@ayunis/ui/components/badge';
import { useTranslation } from 'react-i18next';
import type { OwnedResource } from '@/features/resource-ownership/model/types';

export function OwnerBadge({
  resource,
  testId,
}: Readonly<{ resource: OwnedResource; testId?: string }>) {
  const { t } = useTranslation('resource-ownership');
  if (resource.ownerType === 'team') {
    return (
      <Badge variant="secondary" data-testid={testId}>
        {t('options.team', { team: resource.ownerDescription?.teamName ?? '' })}
      </Badge>
    );
  }
  if (resource.ownerType === 'org') {
    return (
      <Badge variant="secondary" data-testid={testId}>
        {t('options.org')}
      </Badge>
    );
  }
  return null;
}
