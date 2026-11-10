import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { createPaneSession } from '@/outlook/api/pane-session';
import { createOutlookI18n } from '@/outlook/lib/i18n';
import {
  canOpenOfficeDialog,
  officeDisplayLanguage,
  officeReady,
} from '@/outlook/lib/office-ready';
import { TaskPane } from '@/outlook/ui/TaskPane';
import './taskpane.css';

async function mount(): Promise<void> {
  const officeAvailable = await officeReady().then(
    canOpenOfficeDialog,
    () => false,
  );
  const i18n = createOutlookI18n(officeDisplayLanguage());
  const root = document.getElementById('app');
  if (!root) return;
  ReactDOM.createRoot(root).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <TaskPane
          session={createPaneSession()}
          officeAvailable={officeAvailable}
        />
      </I18nextProvider>
    </StrictMode>,
  );
}

void mount();
