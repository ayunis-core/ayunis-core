import type { useChatDraft } from '@ayunis/chat/composer';
import type { ChatCapabilities } from './chat-surface-config';
import type {
  ChatConversationAdapters,
  ChatConversationSlots,
} from './chat-conversation-config';
import type { SendMessageInput } from './use-chat-run-lifecycle';

export interface ConfiguredComposerRef {
  readonly setMessage: (message: string) => void;
  readonly sendMessage: (message: string) => void;
  readonly restoreFailedSubmission: (text: string, files: File[]) => boolean;
}

export interface ConfiguredComposerProps {
  readonly threadId: string;
  readonly compact?: boolean;
  readonly isSubmitting?: boolean;
  readonly sentPrompts?: readonly string[];
  readonly placeholder?: string;
  readonly selectedSkillId?: string;
  readonly fileInputTestId?: string;
  readonly stopTestId?: string;
  readonly clearImagesOnSend?: boolean;
  readonly capabilities: ChatCapabilities;
  readonly adapters?: ChatConversationAdapters;
  readonly draft: ReturnType<typeof useChatDraft>;
  readonly slots?: ChatConversationSlots;
  readonly isStreaming: boolean;
  readonly isCheckingForRun: boolean;
  readonly onSend: (input: SendMessageInput, accepted: () => void) => void;
  readonly onStop?: () => void;
}
