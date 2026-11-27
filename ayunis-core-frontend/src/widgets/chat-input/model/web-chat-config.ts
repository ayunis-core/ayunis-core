import type { ChatConfig } from '@ayunis/chat/surface';
import { TOUR_TARGET } from '@/widgets/onboarding';
import { readChatDraft, writeChatDraft } from '@/shared/lib/chat-draft-storage';

export const WEB_CHAT_TOUR_TARGETS = {
  composer: TOUR_TARGET.chatComposer,
  upload: TOUR_TARGET.chatUpload,
  voice: TOUR_TARGET.voiceInput,
  send: TOUR_TARGET.sendMessage,
  model: TOUR_TARGET.modelSelector,
  anonymous: TOUR_TARGET.anonymousMode,
} satisfies ChatConfig['tourTargets'];

export const WEB_CHAT_DRAFTS = { read: readChatDraft, write: writeChatDraft };
