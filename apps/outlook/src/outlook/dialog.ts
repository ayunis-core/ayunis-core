import { handOverOfficeSession } from '@ayunis/office-addin/session-handoff';
import { officeDisplayLanguage } from '@ayunis/office-addin/office';
import { OUTLOOK_CLIENT, paneApiBaseUrl } from '@/outlook/api/config';
import { createOutlookI18n } from '@/outlook/lib/i18n';

async function handOver(): Promise<void> {
  const status = document.getElementById('status');
  await handOverOfficeSession({
    apiBaseUrl: paneApiBaseUrl,
    client: OUTLOOK_CLIENT,
    statusElement: status,
    copy: () => {
      const i18n = createOutlookI18n(officeDisplayLanguage());
      return {
        connectingText: i18n.t('dialog.connecting'),
        officeRequiredText: i18n.t('dialog.outlookRequired'),
      };
    },
  });
}

void handOver();
