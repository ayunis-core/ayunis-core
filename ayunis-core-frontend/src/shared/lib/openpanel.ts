import { OpenPanel } from '@openpanel/web';
import config, { isProduction } from '@/shared/config';

interface ScreenViewRouter {
  subscribe(
    event: 'onResolved',
    listener: (event: { toLocation: { pathname: string } }) => void,
  ): () => void;
}

interface ScreenViewAnalytics {
  screenView(pathname: string): void;
}

interface OutgoingLinkAnalytics {
  track(name: string, properties: Record<string, string>): void;
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
        trackOutgoingLinks: false,
        trackScreenViews: false,
      })
    : null;

export function trackOpenPanelScreenViews(
  router: ScreenViewRouter,
  analytics: ScreenViewAnalytics,
): () => void {
  let trackedPathname: string | undefined;
  return router.subscribe('onResolved', ({ toLocation }) => {
    if (toLocation.pathname === trackedPathname) return;
    trackedPathname = toLocation.pathname;
    analytics.screenView(trackedPathname);
  });
}

export function trackOpenPanelOutgoingLinks(
  analytics: OutgoingLinkAnalytics,
): () => void {
  const currentOrigin = window.location.origin;
  const listener = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const href = event.target.closest('a')?.getAttribute('href');
    if (!href) return;

    try {
      const url = new URL(href, currentOrigin);
      const isHttp = url.protocol === 'http:' || url.protocol === 'https:';
      if (isHttp && url.origin !== currentOrigin) {
        analytics.track('link_out', { href: url.origin });
      }
    } catch {
      return;
    }
  };

  document.addEventListener('click', listener);
  return () => document.removeEventListener('click', listener);
}
