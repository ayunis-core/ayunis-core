import { useState } from 'react';
import { useChatAttachments } from '@/features/chat-attachments';
import { useIsThreadRunDeferred } from '@/features/thread-run';
import type { Thread } from '@/pages/chat/model/openapi';

export function useChatSourceAttachments(thread: Thread) {
  const uploads = useChatAttachments(thread.id);
  const isDeferred = useIsThreadRunDeferred(thread.id);
  const [submission, setSubmission] = useState(() => ({
    threadId: thread.id,
    at: isDeferred ? Date.now() : 0,
  }));
  const submittedAt = submission.threadId === thread.id ? submission.at : 0;
  const lastUserAt = Math.max(
    0,
    ...thread.messages
      .filter((message) => message.role === 'user')
      .map((message) => Date.parse(message.createdAt)),
  );
  const sentBefore = Math.max(lastUserAt, submittedAt);
  const isSubmitted = (source: Thread['sources'][number]) =>
    Date.parse(source.createdAt) <= sentBefore ||
    uploads.submittedSourceIds.includes(source.id);
  const visibleSources = thread.sources.filter(
    (source) => source.createdBy !== 'system',
  );
  const conversationSources = visibleSources.filter(isSubmitted);
  const composerSources = [
    ...visibleSources.filter((source) => !isSubmitted(source)),
    ...uploads.attachments.filter(
      (upload) =>
        !upload.submitted &&
        !upload.sourceIds.some((id) =>
          thread.sources.some((source) => source.id === id),
        ),
    ),
  ];
  function submit() {
    setSubmission({ threadId: thread.id, at: Date.now() });
    uploads.submit(thread.id);
  }
  return {
    ...uploads,
    conversationSources,
    composerSources,
    submit,
    isDeferred,
  };
}
