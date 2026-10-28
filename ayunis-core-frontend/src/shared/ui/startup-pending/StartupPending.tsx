import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { AnyRouter } from '@tanstack/react-router';
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STARTUP_PENDING_DELAY_MS = 1000;

// Rendered outside RouterProvider: the router has no pending component, so
// navigations keep the previous page, but a cold load has no page to keep.
export function StartupPending({ router }: Readonly<{ router: AnyRouter }>) {
  const { t } = useTranslation('common');
  const subscribe = useCallback(
    (onChange: () => void) => router.subscribe('onResolved', onChange),
    [router],
  );
  const resolved = useSyncExternalStore(
    subscribe,
    () => router.state.resolvedLocation !== undefined,
  );
  const [delayElapsed, setDelayElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setDelayElapsed(true),
      STARTUP_PENDING_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  if (resolved || !delayElapsed) {
    return null;
  }

  return (
    <div
      role="status"
      data-testid="startup-pending"
      className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-background p-4 text-center"
    >
      <LoaderCircle
        aria-hidden="true"
        className="h-10 w-10 animate-spin text-muted-foreground"
      />
      <p className="font-medium">{t('common.pagePending.title')}</p>
      <p className="text-sm text-muted-foreground">
        {t('common.pagePending.description')}
      </p>
    </div>
  );
}
