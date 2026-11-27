import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import '@/outlook/taskpane.css';
import { configureApiTransport } from '@ayunis/api-client/transport';
import { createOfficeAddinSession } from '@ayunis/office-addin/session';
import { createOfficeSignInDialog } from '@ayunis/office-addin/sign-in-dialog';
import {
  officeDialogAvailable,
  officeDisplayLanguage,
  officeReady,
} from '@ayunis/office-addin/office';
import {
  OUTLOOK_CLIENT,
  OUTLOOK_LOGIN_PATH,
  OUTLOOK_REFRESH_TOKEN_KEY,
  paneApiBaseUrl,
} from '@/outlook/api/config';
import { applyOutlookLanguage, createOutlookI18n } from '@/outlook/lib/i18n';
import { TaskPane } from '@/outlook/ui/TaskPane';
import { OutlookChatApp } from '@/outlook/ui/OutlookChatApp';

const openSignInDialog = createOfficeSignInDialog({
  client: OUTLOOK_CLIENT,
  loginPath: OUTLOOK_LOGIN_PATH,
});

// The pane renders without waiting for Office.js: a stored session restores
// without it, and sign-in waits for it when pressed. Until Office reports
// its display language the browser's is used.
function mountPane(): void {
  const session = createOfficeAddinSession({
    baseUrl: paneApiBaseUrl,
    refreshTokenKey: OUTLOOK_REFRESH_TOKEN_KEY,
  });
  configureApiTransport(session.transport);
  const i18n = createOutlookI18n(officeDisplayLanguage());
  void officeReady().then(
    () => {
      applyOutlookLanguage(i18n, officeDisplayLanguage());
    },
    () => undefined,
  );
  const root = document.getElementById('app');
  if (!root) return;
  ReactDOM.createRoot(root).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <TaskPane
          session={session}
          officeAvailable={officeDialogAvailable}
          openSignInDialog={openSignInDialog}
        >
          {(user) => (
            <OutlookChatApp
              key={user.orgId + ':' + user.id}
              user={user}
              session={session}
            />
          )}
        </TaskPane>
      </I18nextProvider>
    </StrictMode>,
  );
}

mountPane();
