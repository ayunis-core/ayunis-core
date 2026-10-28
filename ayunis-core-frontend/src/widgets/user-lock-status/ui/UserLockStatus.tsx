import { Badge } from '@ayunis/ui/components/badge';
import { useTranslation } from 'react-i18next';

export function UserLockStatus({ isLocked }: Readonly<{ isLocked?: boolean }>) {
  const { t } = useTranslation('common', { keyPrefix: 'accountLock' });

  return (
    <Badge
      variant={isLocked ? 'destructive' : 'secondary'}
      data-testid="user-lock-status"
      data-state={isLocked ? 'locked' : 'active'}
    >
      {t(isLocked ? 'status.locked' : 'status.active')}
    </Badge>
  );
}
