import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { Toaster } from '@ayunis/ui/components/sonner';
import type { MeResponseDto } from '@ayunis/api-client/schemas';
import {
  ConfirmationProvider,
  ConfirmationModal,
} from '@/widgets/confirmation-modal';
import { getTheme, setTheme } from '@/features/theme';

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  user: MeResponseDto | null;
  /** The Outlook pane's embedded mode; see `EmbeddedContext`. */
  embedded: boolean;
}>()({
  beforeLoad: () => {
    const theme = getTheme();
    setTheme(theme);
  },
  component: () => (
    <>
      <ConfirmationProvider>
        <Outlet />
        <ConfirmationModal />
        <Toaster />
      </ConfirmationProvider>
    </>
  ),
});
