import type {
  ModelModeResolutionResponseDto,
  PermittedLanguageModelResponseDto,
} from '@ayunis/api-client/schemas';
import type { ChatSourceAttachment } from '@ayunis/chat/attachments';
import type { useChatDraft } from '@ayunis/chat/composer';
import type { ChatConfig } from './chat-config';
import type { SendMessageInput } from './use-chat-run-lifecycle';

export type ComposerConfig = Pick<
  ChatConfig,
  'layout' | 'skills' | 'knowledgeBases' | 'integrations' | 'tourTargets'
>;

export interface ComposerModelControl {
  readonly models: PermittedLanguageModelResponseDto[];
  readonly resolutions: ModelModeResolutionResponseDto[];
  readonly value: string | undefined;
  readonly placeholder: string;
  readonly disabled: boolean;
  /** The selection is fixed, as in an existing chat; the selector says why. */
  readonly locked: boolean;
  readonly onChange: (value: string) => void;
}

export interface ComposerAnonymousControl {
  readonly isAnonymous: boolean;
  readonly isEnforced?: boolean;
  readonly disabled?: boolean;
  readonly onChange?: (isAnonymous: boolean) => void;
}

/** What the conversation or new-chat composer resolved from the shared data. */
export interface ComposerFeatures {
  readonly model: ComposerModelControl;
  readonly anonymous: ComposerAnonymousControl;
  readonly sources: readonly ChatSourceAttachment[];
  readonly removeSource: (sourceId: string) => void;
  /** Absent while documents cannot be attached, e.g. without an embedding model. */
  readonly uploadFiles?: (files: File[]) => void;
  readonly imageAttachments: boolean;
  readonly voice: boolean;
  readonly sendDisabled: boolean;
}

export interface ConfiguredComposerRef {
  readonly setMessage: (message: string) => void;
  readonly sendMessage: (message: string) => void;
  readonly restoreFailedSubmission: (text: string, files: File[]) => boolean;
}

export interface ConfiguredComposerProps {
  readonly config: ComposerConfig;
  readonly features: ComposerFeatures;
  readonly threadId: string;
  readonly isSubmitting?: boolean;
  readonly sentPrompts?: readonly string[];
  readonly placeholder?: string;
  readonly clearImagesOnSend?: boolean;
  readonly draft: ReturnType<typeof useChatDraft>;
  readonly isStreaming: boolean;
  readonly isCheckingForRun: boolean;
  readonly onSend: (input: SendMessageInput, accepted: () => void) => void;
  readonly onStop?: () => void;
}
