import { forwardRef } from 'react';
import {
  ConfiguredComposer,
  type ConfiguredComposerRef,
} from '@ayunis/chat/surface';
import type { ChatInputSubmissionState } from '@ayunis/chat/composer';
import { useChatDraft } from '@/widgets/chat-input/hooks/useChatDraft';
import type { WebComposerConfigurationProps } from '@/widgets/chat-input/model/useWebComposerConfiguration';
import { useWebComposerConfiguration } from '@/widgets/chat-input/model/useWebComposerConfiguration';

export type { ChatInputSubmissionState } from '@ayunis/chat/composer';
export type ChatInputRef = ConfiguredComposerRef;

interface ChatInputProps extends WebComposerConfigurationProps {
  submissionState?: ChatInputSubmissionState;
  onSend: (
    message: string,
    imageFiles?: Array<{ file: File; altText?: string }>,
    skillId?: string,
    voiceInput?: boolean,
  ) => void;
  onCancel: () => void;
  isCancelDisabled?: boolean;
  initialMessage?: string;
  placeholder?: string;
  draftChatId?: string;
  sentPrompts?: readonly string[];
}

const NO_PROMPTS: readonly string[] = [];

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  function ChatInput(props, ref) {
    const configuration = useWebComposerConfiguration(props);
    const draft = useChatDraft(props.draftChatId, props.initialMessage);
    const state = props.submissionState ?? 'idle';
    return (
      <ConfiguredComposer
        ref={ref}
        compact
        threadId={props.draftChatId ?? 'new-chat'}
        capabilities={configuration.capabilities}
        draft={draft}
        slots={configuration.slots}
        sentPrompts={props.sentPrompts ?? NO_PROMPTS}
        placeholder={props.placeholder}
        selectedSkillId={props.selectedSkillId}
        fileInputTestId="chat-file-upload-input"
        stopTestId="cancel"
        clearImagesOnSend
        isSubmitting={state === 'submitting'}
        isStreaming={state === 'streaming'}
        isCheckingForRun={false}
        adapters={configuration.adapters}
        onSend={(input) =>
          props.onSend(
            input.text,
            input.images,
            input.skillId,
            input.voiceInput,
          )
        }
        onStop={props.isCancelDisabled ? undefined : props.onCancel}
      />
    );
  },
);

ChatInput.displayName = 'ChatInput';

export default ChatInput;
