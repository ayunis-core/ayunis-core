import { QueryClient } from '@tanstack/react-query';
import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import { ErrorFallback } from '@/shared/ui/error-boundary/ErrorFallback';
import { isChunkLoadError } from '@/shared/lib/is-chunk-load-error';
import { attemptChunkReload } from '@/shared/lib/chunk-reload-guard';
import { shouldRetryQuery } from '@/shared/api/client';
import { routeTree } from '@/app/routeTree.gen';

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: shouldRetryQuery,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}

export function createAppRouter(queryClient: QueryClient, embedded: boolean) {
  return createRouter({
    routeTree,
    // Outlook may frame only the pane's own document (AYC-1899), so embedded
    // routes never reach the address bar: a reload, the chunk-reload guard or
    // the error page's reload loads the pane again, not a blocked app route.
    history: embedded
      ? createMemoryHistory({ initialEntries: ['/chat'] })
      : undefined,
    context: { queryClient, user: null, embedded },
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: ({ error }) => {
      // Auto-reload on chunk load errors (stale deployment)
      if (isChunkLoadError(error) && attemptChunkReload()) {
        return null;
      }

      return <ErrorFallback onReset={() => window.location.reload()} />;
    },
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
