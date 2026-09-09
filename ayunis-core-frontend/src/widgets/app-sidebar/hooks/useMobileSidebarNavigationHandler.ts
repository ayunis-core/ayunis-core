import { useCallback, type MouseEventHandler } from 'react';
import { useSidebar } from '@ayunis/ui/components/sidebar';

export function useMobileSidebarNavigationHandler(): MouseEventHandler<HTMLDivElement> {
  const { closeMobileWithCleanup } = useSidebar();

  return useCallback(
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const control = target.closest('a, button, input, [role="button"]');
      if (control?.tagName === 'A') closeMobileWithCleanup();
    },
    [closeMobileWithCleanup],
  );
}
