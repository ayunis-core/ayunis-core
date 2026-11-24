import { useChatDraft as useDraft } from '@ayunis/chat/composer';
import { readChatDraft, writeChatDraft } from '@/shared/lib/chat-draft-storage';

const storage = { read: readChatDraft, write: writeChatDraft };

export function useChatDraft(
  chatId: string | undefined,
  initialMessage?: string,
) {
  return useDraft(chatId, storage, initialMessage);
}
