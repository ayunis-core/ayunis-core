import { applyDomPatch } from '@/shared/lib/dom-patch';
applyDomPatch(); // Must be called before React renders

import { initAppsignal } from '@/shared/lib/appsignal';
initAppsignal();

import {
  attemptChunkReload,
  clearChunkReloadFlag,
} from '@/shared/lib/chunk-reload-guard';

// Clear the reload flag on successful load to allow future reloads if needed
clearChunkReloadFlag();

// Auto-reload when Vite chunk imports fail after a deployment
// (users with stale index.html try to load chunks that no longer exist)
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  attemptChunkReload();
});

import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootLayout from './layouts/root-layout';
import { ErrorBoundary } from '@/shared/ui/error-boundary';
import { ErrorFallback } from '@/shared/ui/error-boundary/ErrorFallback';
import { PagePending } from '@/shared/ui/page-pending/PagePending';
import { isChunkLoadError } from '@/shared/lib/is-chunk-load-error';
import { shouldRetryQuery } from '@/shared/api/client';
import {
  createOpenPanelScreenViewAnalytics,
  openPanel,
  trackOpenPanelOutgoingLinks,
  trackOpenPanelScreenViews,
} from '@/shared/lib/openpanel';

// Import the generated route tree
import { routeTree } from './app/routeTree.gen.ts';

import './styles/main.css';
import './i18n.ts';
import reportWebVitals from './reportWebVitals.ts';

// Create a new QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: shouldRetryQuery,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient, user: null },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  // Shown after the router's 1s pendingMs, e.g. while reads retry through a
  // deploy restart, so the page isn't blank.
  defaultPendingComponent: PagePending,
  defaultErrorComponent: ({ error }) => {
    // Auto-reload on chunk load errors (stale deployment)
    if (isChunkLoadError(error) && attemptChunkReload()) {
      return null;
    }

    return <ErrorFallback onReset={() => window.location.reload()} />;
  },
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

if (openPanel) {
  trackOpenPanelScreenViews(
    router,
    createOpenPanelScreenViewAnalytics(openPanel),
  );
  trackOpenPanelOutgoingLinks(openPanel);
}

// Render the app
const rootElement = document.getElementById('app');
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <RootLayout>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </RootLayout>
      </ErrorBoundary>
    </StrictMode>,
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
