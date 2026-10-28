import { Badge } from '@ayunis/ui/components/badge';
import { useTranslation } from 'react-i18next';
import type { InviteResponseDtoStatus } from '@/shared/api';

type BadgeVariant = 'destructive' | 'outline' | 'secondary';

const STATUS_VARIANT: Record<InviteResponseDtoStatus, BadgeVariant> = {
  pending: 'outline',
  accepted: 'secondary',
  expired: 'destructive',
};

export function InviteStatusBadge({
  status,
}: Readonly<{ status: InviteResponseDtoStatus }>) {
  const { t } = useTranslation('admin-settings-users');

  return <Badge variant={STATUS_VARIANT[status]}>{t(`users.${status}`)}</Badge>;
}
