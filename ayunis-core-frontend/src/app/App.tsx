import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import RootLayout from '@/layouts/root-layout';
import { ErrorBoundary } from '@/shared/ui/error-boundary';
import { StartupPending } from '@/shared/ui/startup-pending/StartupPending';
import {
  EmbeddedContext,
  EmbeddedSignOutContext,
} from '@/shared/contexts/embedded/embeddedContext';
import type { AppRouter } from '@/app/app-router';

export function App({
  router,
  queryClient,
  embedded,
  onEmbeddedSignOut,
}: Readonly<{
  router: AppRouter;
  queryClient: QueryClient;
  embedded: boolean;
  onEmbeddedSignOut?: () => Promise<void>;
}>) {
  return (
    <ErrorBoundary>
      <EmbeddedContext.Provider value={embedded}>
        <EmbeddedSignOutContext.Provider value={onEmbeddedSignOut}>
          <RootLayout>
            <QueryClientProvider client={queryClient}>
              <RouterProvider router={router} />
              <StartupPending router={router} />
            </QueryClientProvider>
          </RootLayout>
        </EmbeddedSignOutContext.Provider>
      </EmbeddedContext.Provider>
    </ErrorBoundary>
  );
}
