import { OpenPanel } from '@openpanel/web';
import config, { isProduction } from '@/shared/config';

interface ScreenViewRouter {
  latestLocation: { pathname: string };
  subscribe(
    event: 'onResolved',
    listener: (event: { toLocation: { pathname: string } }) => void,
  ): () => void;
}

interface ScreenViewAnalytics {
  screenView(pathname: string): void;
}

const apiUrl = config.analytics.openPanelApiUrl;
const clientId = config.analytics.openPanelClientId;

export const openPanel =
  apiUrl && clientId
    ? new OpenPanel({
        apiUrl,
        clientId,
        disabled: !isProduction(),
        trackAttributes: true,
        trackOutgoingLinks: true,
        trackScreenViews: false,
      })
    : null;

export function trackOpenPanelScreenViews(
  router: ScreenViewRouter,
  analytics: ScreenViewAnalytics,
): () => void {
  analytics.screenView(router.latestLocation.pathname);
  return router.subscribe('onResolved', ({ toLocation }) => {
    analytics.screenView(toLocation.pathname);
  });
}
