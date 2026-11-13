import { useEffect, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { generateUUID } from '@/shared/lib/uuid';
import {
  getAttachments,
  subscribeAttachments,
} from '@/features/chat-attachments/model/attachment-store';
import {
  startAttachmentUpload,
  completeAttachmentUpload,
  bindAttachments,
  discardAttachment,
} from '@/features/chat-attachments/api/attachment-uploads';

export function useChatAttachments(threadId?: string) {
  const [draftId] = useState(generateUUID);
  const scope = threadId ?? draftId;
  const queryClient = useQueryClient();
  const all = useSyncExternalStore(subscribeAttachments, getAttachments);
  const attachments = all.filter((item) => item.scope === scope);
  const { t } = useTranslation('common');
  useEffect(
    () => () => {
      if (threadId) return;
      getAttachments()
        .filter((item) => item.scope === scope && !item.submitted)
        .forEach((item) => discardAttachment(item.id, queryClient));
    },
    [threadId, scope, queryClient],
  );
  function upload(files: File[]) {
    files.forEach((file) => {
      const id = startAttachmentUpload(
        scope,
        file,
        (error) => handleSourceUploadError(error, t),
        threadId,
      );
      if (threadId) void completeAttachmentUpload(id, threadId, queryClient);
    });
  }
  function submit(targetThreadId: string) {
    const ids = attachments
      .filter((item) => !item.attached)
      .map((item) => item.id);
    bindAttachments(ids, targetThreadId, queryClient);
  }
  return {
    attachments: attachments.filter((item) => !item.attached),
    submittedSourceIds: attachments
      .filter((item) => item.submitted)
      .flatMap((item) => item.sourceIds),
    upload,
    remove: (id: string) => discardAttachment(id, queryClient),
    submit,
  };
}
