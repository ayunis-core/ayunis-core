import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  toolApprovalsControllerDecide,
  type DecideToolApprovalDtoDecision,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

interface DecideToolApprovalInput {
  threadId: string;
  toolCallId: string;
  decision: DecideToolApprovalDtoDecision;
}

/**
 * Resumes a chat turn that is waiting on a tool call. The decision itself has
 * no cached representation: the open run stream delivers the resulting tool
 * result message, so there is nothing to invalidate on success.
 */
export function useDecideToolApproval() {
  const { t } = useTranslation('chat');
  return useMutation({
    mutationFn: ({ threadId, toolCallId, decision }: DecideToolApprovalInput) =>
      toolApprovalsControllerDecide(threadId, toolCallId, { decision }),
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        if (code === 'RUN_TOOL_APPROVAL_NOT_FOUND') {
          showError(t('chat.timeline.approval.notPending'));
        } else {
          showError(t('chat.timeline.approval.error'));
        }
      } catch {
        showError(t('chat.timeline.approval.error'));
      }
    },
  });
}
