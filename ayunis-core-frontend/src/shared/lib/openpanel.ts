import { OpenPanel } from '@openpanel/web';
import config, { isProduction } from '@/shared/config';

interface ScreenViewRouter {
  readonly state: {
    readonly matches: ReadonlyArray<{
      readonly fullPath: string;
      readonly globalNotFound?: boolean;
    }>;
  };
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

openPanel?.setGlobalProperties({
  __referrer: sanitizeOpenPanelReferrer(document.referrer),
});

export function sanitizeOpenPanelReferrer(referrer: string): string {
  try {
    return new URL(referrer).origin;
  } catch {
    return '';
  }
}

export function createOpenPanelScreenViewAnalytics(
  client: OpenPanel,
): ScreenViewAnalytics {
  let currentPathname: string | undefined;
  return {
    screenView(pathname) {
      const properties = { __title: document.title };
      if (pathname === currentPathname) {
        void client.track('screen_view', properties);
        return;
      }
      currentPathname = pathname;
      client.screenView(pathname, properties);
    },
  };
}

export function trackOpenPanelScreenViews(
  router: ScreenViewRouter,
  analytics: ScreenViewAnalytics,
): () => void {
  let trackedPathname: string | undefined;
  return router.subscribe('onResolved', ({ toLocation }) => {
    if (toLocation.pathname === trackedPathname) return;
    trackedPathname = toLocation.pathname;
    analytics.screenView(resolvedRouteTemplate(router.state.matches));
  });
}

function resolvedRouteTemplate(
  matches: ScreenViewRouter['state']['matches'],
): string {
  const leafMatch = matches.at(-1);
  if (!leafMatch || matches.some((match) => match.globalNotFound)) {
    return '/__unmatched__';
  }
  return leafMatch.fullPath === '/'
    ? leafMatch.fullPath
    : leafMatch.fullPath.replace(/\/$/, '');
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
