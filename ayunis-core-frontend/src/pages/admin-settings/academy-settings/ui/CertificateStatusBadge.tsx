import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import { CertificateValidityStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { CERTIFICATE_STATUS_LABEL_KEYS } from '../model/statuses';

type BadgeVariant = 'secondary' | 'destructive' | 'outline';

const VARIANTS: Record<CertificateValidityStatus, BadgeVariant> = {
  [CertificateValidityStatus.valid]: 'secondary',
  [CertificateValidityStatus.expiring_soon]: 'outline',
  [CertificateValidityStatus.expired]: 'destructive',
  [CertificateValidityStatus.not_passed]: 'outline',
};

export function CertificateStatusBadge({
  status,
}: Readonly<{ status: CertificateValidityStatus }>) {
  const { t } = useTranslation('admin-settings-academy');

  return (
    <Badge variant={VARIANTS[status]}>
      {t(CERTIFICATE_STATUS_LABEL_KEYS[status])}
    </Badge>
  );
}
