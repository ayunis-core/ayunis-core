import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import appI18n from '@/i18n';
import { configureAppApi } from '@/shared/api/client';
import { createPaneSession } from '@/outlook/api/pane-session';
import { applyOutlookLanguage, createOutlookI18n } from '@/outlook/lib/i18n';
import {
  officeDialogAvailable,
  officeDisplayLanguage,
  officeReady,
} from '@/outlook/lib/office-ready';
import { TaskPane } from '@/outlook/ui/TaskPane';
import { EmbeddedApp } from '@/outlook/ui/EmbeddedApp';

// The pane renders without waiting for Office.js: a stored session restores
// without it, and sign-in waits for it when pressed. Until Office reports
// its display language the browser's is used.
export function mountPane(): void {
  const session = createPaneSession();
  configureAppApi(session.transport);
  const i18n = createOutlookI18n(officeDisplayLanguage());
  applyOutlookLanguage(appI18n, officeDisplayLanguage());
  void officeReady().then(
    () => {
      applyOutlookLanguage(i18n, officeDisplayLanguage());
      applyOutlookLanguage(appI18n, officeDisplayLanguage());
    },
    () => undefined,
  );
  const root = document.getElementById('app');
  if (!root) return;
  ReactDOM.createRoot(root).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <TaskPane session={session} officeAvailable={officeDialogAvailable}>
          {(user) => (
            <EmbeddedApp userId={user.id} onSignOut={session.signOut} />
          )}
        </TaskPane>
      </I18nextProvider>
    </StrictMode>,
  );
}
