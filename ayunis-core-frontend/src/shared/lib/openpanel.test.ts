import { expect, it } from 'vitest';
import {
  trackOpenPanelOutgoingLinks,
  trackOpenPanelScreenViews,
} from './openpanel';

it('tracks each resolved pathname once without sensitive search parameters', () => {
  const trackedPaths: string[] = [];
  const listeners: Array<
    (event: { toLocation: { pathname: string } }) => void
  > = [];
  const router = {
    subscribe: (
      _event: 'onResolved',
      listener: (event: { toLocation: { pathname: string } }) => void,
    ) => {
      listeners.push(listener);
      return () => undefined;
    },
  };
  const analytics = {
    screenView: (pathname: string) => {
      trackedPaths.push(pathname);
    },
  };

  trackOpenPanelScreenViews(router, analytics);
  expect(trackedPaths).toEqual([]);
  listeners.at(0)?.({ toLocation: { pathname: '/password/reset' } });
  listeners.at(0)?.({ toLocation: { pathname: '/password/reset' } });
  listeners.at(0)?.({ toLocation: { pathname: '/accept-invite' } });
  listeners.at(0)?.({ toLocation: { pathname: '/accept-invite' } });

  expect(listeners).toHaveLength(1);
  expect(trackedPaths).toEqual(['/password/reset', '/accept-invite']);
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
