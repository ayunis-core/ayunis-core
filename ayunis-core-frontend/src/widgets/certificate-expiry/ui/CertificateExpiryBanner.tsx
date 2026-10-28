import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { AppBannerStrip } from '@/shared/ui/app-banner-strip';
import { useCertificateExpiryNotice } from '@/widgets/certificate-expiry/model/useCertificateExpiryNotice';

/**
 * The final week before a certificate lapses, counting down daily. Deliberately
 * has no dismiss control: from here on the member loses chat access unless they
 * renew.
 */
export default function CertificateExpiryBanner() {
  const { t } = useTranslation('academy');
  const { level, daysRemaining } = useCertificateExpiryNotice();

  if (level !== 'countdown') {
    return null;
  }

  return (
    <AppBannerStrip tone="destructive">
      {t('expiry.banner', { count: daysRemaining })}{' '}
      <Link to="/academy" className="underline underline-offset-4">
        {t('expiry.action')}
      </Link>
    </AppBannerStrip>
  );
}
