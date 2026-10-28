import { OpenPanel } from '@openpanel/web';
import { expect, it } from 'vitest';
import {
  createOpenPanelScreenViewAnalytics,
  sanitizeOpenPanelReferrer,
  trackOpenPanelOutgoingLinks,
  trackOpenPanelScreenViews,
} from './openpanel';

type RouteMatch = {
  fullPath: string;
  globalNotFound?: boolean;
};

function createScreenViewHarness() {
  const trackedPaths: string[] = [];
  let listener:
    ((event: { toLocation: { pathname: string } }) => void) | undefined;
  const router = {
    state: { matches: [] as RouteMatch[] },
    subscribe: (
      _event: 'onResolved',
      nextListener: (event: { toLocation: { pathname: string } }) => void,
    ) => {
      listener = nextListener;
      return () => undefined;
    },
  };
  const analytics = {
    screenView: (pathname: string) => trackedPaths.push(pathname),
  };

  trackOpenPanelScreenViews(router, analytics);

  return {
    trackedPaths,
    resolve(pathname: string, matches: RouteMatch[]) {
      router.state.matches = matches;
      listener?.({ toLocation: { pathname } });
    },
  };
}

it('tracks each static route once without sensitive search parameters', () => {
  const harness = createScreenViewHarness();

  harness.resolve('/password/reset', [{ fullPath: '/password/reset' }]);
  harness.resolve('/password/reset', [{ fullPath: '/password/reset' }]);
  harness.resolve('/accept-invite', [{ fullPath: '/accept-invite' }]);

  expect(harness.trackedPaths).toEqual(['/password/reset', '/accept-invite']);
});

it('groups different route parameters under the stable route template', () => {
  const harness = createScreenViewHarness();
  const matches = [{ fullPath: '/' }, { fullPath: '/chats/$threadId' }];

  harness.resolve('/chats/thread-a', matches);
  harness.resolve('/chats/thread-b', matches);

  expect(harness.trackedPaths).toEqual([
    '/chats/$threadId',
    '/chats/$threadId',
  ]);
});

it('emits consecutive views of the same route template through OpenPanel', () => {
  const client = new OpenPanel({ clientId: 'test-client', disabled: true });
  const analytics = createOpenPanelScreenViewAnalytics(client);

  analytics.screenView('/chats/$threadId');
  analytics.screenView('/chats/$threadId');

  expect(client.queue).toMatchObject([
    {
      type: 'track',
      payload: {
        name: 'screen_view',
        properties: { __path: '/chats/$threadId' },
      },
    },
    {
      type: 'track',
      payload: {
        name: 'screen_view',
        properties: { __path: '/chats/$threadId' },
      },
    },
  ]);
});

it('keeps only the referrer origin', () => {
  expect(
    sanitizeOpenPanelReferrer(
      'https://example.com/private/report?token=secret#section',
    ),
  ).toBe('https://example.com');
  expect(sanitizeOpenPanelReferrer('not a URL')).toBe('');
});

it('normalizes an index route template to its canonical pathname', () => {
  const harness = createScreenViewHarness();

  harness.resolve('/chats', [{ fullPath: '/chats/' }]);

  expect(harness.trackedPaths).toEqual(['/chats']);
});

it('groups unmatched paths without exposing their raw pathname', () => {
  const harness = createScreenViewHarness();

  harness.resolve('/private/raw-value', [
    { fullPath: '/', globalNotFound: true },
  ]);

  expect(harness.trackedPaths).toEqual(['/__unmatched__']);
});

it('tracks only the origin of outgoing links', () => {
  const trackedEvents: Array<{
    name: string;
    properties: Record<string, string>;
  }> = [];
  const analytics = {
    track: (name: string, properties: Record<string, string>) => {
      trackedEvents.push({ name, properties });
    },
  };
  const link = document.createElement('a');
  link.href = 'https://example.com/private/report?token=secret#section';
  const linkContent = document.createElement('span');
  linkContent.textContent = 'Sensitive report title';
  link.append(linkContent);
  link.addEventListener('click', (event) => event.preventDefault());
  document.body.append(link);

  const stopTracking = trackOpenPanelOutgoingLinks(analytics);
  linkContent.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true }),
  );
  stopTracking();
  link.remove();

  expect(trackedEvents).toEqual([
    { name: 'link_out', properties: { href: 'https://example.com' } },
  ]);
});
