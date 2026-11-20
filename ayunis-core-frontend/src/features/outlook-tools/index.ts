export * from '@/features/outlook-tools/lib/outlook-tool-names';
export * from '@/features/outlook-tools/lib/execute-outlook-tool';
export * from '@/features/outlook-tools/lib/outlook-tool-calls';
export {
  currentOutlookItemKey,
  currentOutlookLegacyReadKey,
  currentOutlookMailboxItem,
  currentOutlookReplySourceKey,
  isReadItemKey,
  notifyOutlookItemChanged,
  subscribeToOutlookItem,
} from '@/features/outlook-tools/lib/outlook-item';
export {
  chatItemKey,
  outlookDraftSource,
  rememberChatItem,
  rememberOutlookDraftSource,
} from '@/features/outlook-tools/lib/chat-items';
export {
  addAttachmentAsSource,
  type AttachmentSource,
  type AttachmentSourceApi,
} from '@/features/outlook-tools/lib/attachment-source';
export {
  clearPendingReplyDraft,
  currentPendingReplyDraftId,
  stagePendingReplyDraft,
  subscribeToPendingReplyDraft,
  takePendingReplyDraft,
  withOutlookReplyDraftLock,
} from '@/features/outlook-tools/lib/pending-reply-draft';
