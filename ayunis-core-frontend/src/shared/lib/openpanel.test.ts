import { expect, it } from 'vitest';
import { trackOpenPanelScreenViews } from './openpanel';

it('tracks initial and resolved route pathnames without sensitive search parameters', () => {
  const trackedPaths: string[] = [];
  const listeners: Array<
    (event: { toLocation: { pathname: string } }) => void
  > = [];
  const router = {
    latestLocation: { pathname: '/password/reset' },
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
  listeners.at(0)?.({ toLocation: { pathname: '/accept-invite' } });

  expect(listeners).toHaveLength(1);
  expect(trackedPaths).toEqual(['/password/reset', '/accept-invite']);
});
