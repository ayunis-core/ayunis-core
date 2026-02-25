import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { threadsControllerDownloadSource } from '@/shared/api/generated/ayunisCoreAPI';
import type { Thread } from '../model/openapi';

export function useDownloadSource(thread: Thread) {
  const { t } = useTranslation('chat');

  const downloadSource = useCallback(
    async (sourceId: string) => {
      try {
        const blob = await threadsControllerDownloadSource(thread.id, sourceId);

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const source = thread.sources.find((s) => s.id === sourceId);
        link.download = source?.name ?? 'download.csv';

        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to download source', error);
        showError(t('chat.errorDownloadSource'));
      }
    },
    [thread.id, thread.sources, t],
  );

  return { downloadSource };
}
