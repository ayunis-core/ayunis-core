import { resetThreadRunSession } from '@/features/thread-run';
import { bootPage } from '@/app/boot-page';
import { recoverableErrorReport, reportError } from '@/shared/lib/appsignal';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { isDevEmbedded } from '@/shared/contexts/embedded/dev-embedded';
import { configureAppApi } from '@/shared/api/client';
import { createPaneSession } from '@/outlook/api/pane-session';
import {
  createOpenPanelScreenViewAnalytics,
  openPanel,
  trackOpenPanelOutgoingLinks,
  trackOpenPanelScreenViews,
} from '@/shared/lib/openpanel';
import { App } from '@/app/App';
import { createAppQueryClient, createAppRouter } from '@/app/app-router';

import './styles/main.css';
import './i18n.ts';
import reportWebVitals from './reportWebVitals.ts';

bootPage();

// /outlook/taskpane.html loads this same entry, so the pane and the web app
// share one build of the app; a second entry would split every route into
// chunks the web app then preloads.
if (document.documentElement.dataset.entry === 'outlook-pane') {
  void import('@/outlook/taskpane').then(({ mountPane }) => mountPane());
} else {
  mountWeb();
}

function mountWeb(): void {
  const embedded = isDevEmbedded(import.meta.env.DEV, window.location.search);
  const paneSession = embedded ? createPaneSession() : undefined;
  configureAppApi(paneSession?.transport);

  const queryClient = createAppQueryClient();
  paneSession?.onEnd(() => resetThreadRunSession(queryClient));
  const router = createAppRouter(queryClient, embedded);

  if (openPanel) {
    trackOpenPanelScreenViews(
      router,
      createOpenPanelScreenViewAnalytics(openPanel),
    );
    trackOpenPanelOutgoingLinks(openPanel);
  }

  const rootElement = document.getElementById('app');
  if (rootElement && !rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement, {
      onRecoverableError: (error, errorInfo) => {
        console.error(error);
        const { matches } = router.state;
        const route =
          matches.length > 0 ? matches[matches.length - 1].fullPath : undefined;
        const report = recoverableErrorReport(error, errorInfo, route);
        reportError(report.error, report.params);
      },
    });
    root.render(
      <StrictMode>
        <App
          router={router}
          queryClient={queryClient}
          embedded={embedded}
          onEmbeddedSignOut={paneSession?.signOut}
        />
      </StrictMode>,
    );
  }
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
