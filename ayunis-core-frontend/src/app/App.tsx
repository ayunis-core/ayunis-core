import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import RootLayout from '@/layouts/root-layout';
import { ErrorBoundary } from '@/shared/ui/error-boundary';
import { StartupPending } from '@/shared/ui/startup-pending/StartupPending';
import { EmbeddedContext } from '@/shared/contexts/embedded/embeddedContext';
import type { AppRouter } from '@/app/app-router';

export function App({
  router,
  queryClient,
  embedded,
}: Readonly<{
  router: AppRouter;
  queryClient: QueryClient;
  embedded: boolean;
}>) {
  return (
    <ErrorBoundary>
      <EmbeddedContext.Provider value={embedded}>
        <RootLayout>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <StartupPending router={router} />
          </QueryClientProvider>
        </RootLayout>
      </EmbeddedContext.Provider>
    </ErrorBoundary>
  );
}
