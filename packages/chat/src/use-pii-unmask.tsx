import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getThreadsControllerFindOneQueryKey,
  useThreadsControllerUnmaskPiiMask,
} from '@ayunis/api-client/endpoints';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import type { PiiMaskEntry } from '@ayunis/chat/markdown';
import { showError, showSuccess } from './chat-toasts';
import { useConfirmDialog } from './confirm-dialog';
import { mergePiiMasks } from './merge-pii-masks';

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { response } = error as { response?: { data?: { code?: unknown } } };
  const code = response?.data?.code;
  return typeof code === 'string' ? code : undefined;
}

function useUnmaskMutation() {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();
  return useThreadsControllerUnmaskPiiMask({
    mutation: {
      onSuccess: async (masks, variables) => {
        const queryKey = getThreadsControllerFindOneQueryKey(variables.id);
        await queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData<GetThreadResponseDto>(queryKey, (thread) =>
          thread
            ? { ...thread, piiMasks: mergePiiMasks(thread.piiMasks, masks) }
            : thread,
        );
        showSuccess(t('chat.piiMask.unmaskSuccess'));
      },
      onError: (error: unknown) => {
        showError(
          errorCode(error) === 'THREAD_PII_MASK_NOT_FOUND'
            ? t('chat.piiMask.unmaskNotFound')
            : t('chat.piiMask.unmaskError'),
        );
      },
    },
  }).mutate;
}

/** Reveals a masked value of the chat for good, once the user confirmed it. */
export function usePiiUnmask(threadId: string) {
  const { t } = useTranslation('chat');
  const unmask = useUnmaskMutation();
  const { confirm, dialog } = useConfirmDialog();
  const onUnmaskRequest = useCallback(
    (entry: PiiMaskEntry) =>
      confirm({
        title: t('chat.piiMask.unmaskTitle', { value: entry.value }),
        description: t('chat.piiMask.unmaskDescription'),
        confirmText: t('chat.piiMask.unmaskConfirm'),
        cancelText: t('chat.piiMask.unmaskCancel'),
        destructive: true,
        onConfirm: () => unmask({ id: threadId, maskId: entry.id }),
      }),
    [confirm, t, unmask, threadId],
  );
  return { onUnmaskRequest, dialog };
}
