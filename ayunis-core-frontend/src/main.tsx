import { bootPage } from '@/app/boot-page';
import { recoverableErrorReport, reportError } from '@/shared/lib/appsignal';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { configureAppApi } from '@/shared/api/client';
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

mountWeb();

function mountWeb(): void {
  configureAppApi();

  const queryClient = createAppQueryClient();
  const router = createAppRouter(queryClient);

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
        <App router={router} queryClient={queryClient} />
      </StrictMode>,
    );
  }
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
