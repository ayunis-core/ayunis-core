import { useAppAlertControllerGetAppAlert } from '@/shared/api';
import { AppBannerStrip } from '@/shared/ui/app-banner-strip';

/**
 * Persistent app-wide alert banner shown at the top of every authenticated
 * page when a super admin has enabled it. Renders nothing when disabled or
 * when no message has been configured.
 */
export default function AppAlertBanner() {
  const { data } = useAppAlertControllerGetAppAlert();

  if (!data?.enabled || data.message.trim().length === 0) {
    return null;
  }

  return (
    // The data attribute anchors the onboarding tour (`TourRenderer`).
    <AppBannerStrip tone="warning" data-app-alert-banner>
      {data.message}
    </AppBannerStrip>
  );
}
