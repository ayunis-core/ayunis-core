import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import RootLayout from '@/layouts/root-layout';
import { ErrorBoundary } from '@/shared/ui/error-boundary';
import { StartupPending } from '@/shared/ui/startup-pending/StartupPending';
import type { AppRouter } from '@/app/app-router';

export function App({
  router,
  queryClient,
}: Readonly<{
  router: AppRouter;
  queryClient: QueryClient;
}>) {
  return (
    <ErrorBoundary>
      <RootLayout>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <StartupPending router={router} />
        </QueryClientProvider>
      </RootLayout>
    </ErrorBoundary>
  );
}
