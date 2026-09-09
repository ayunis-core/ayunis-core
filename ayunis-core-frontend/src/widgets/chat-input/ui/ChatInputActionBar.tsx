import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import PlusButton from './PlusButton';
import ModelSelector from './ModelSelector';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import { SendButton } from './SendButton';
import { AnonymousButton } from './AnonymousButton';
import { SkillBadge } from './SkillBadge';
import { MicrophoneButton } from './MicrophoneButton';
import { ChatInputToolbar } from './ChatInputToolbar';
import type {
  IntegrationSummary,
  KnowledgeBaseSummary,
} from '@/shared/contexts/chat/chatContext';

interface ChatInputActionBarProps {
  isSubmitting: boolean;
  isEmbeddingModelEnabled: boolean;
  isVisionEnabled: boolean;
  knowledgeBases?: KnowledgeBaseSummary[];
  mcpIntegrations?: IntegrationSummary[];
  onFileUpload: (files: File[]) => void;
  onImageSelect: (files: FileList | null) => void;
  onAddKnowledgeBase?: (knowledgeBase: KnowledgeBaseSummary) => void;
  onAddIntegration?: (integration: IntegrationSummary) => void;
  isAnonymous: boolean;
  onAnonymousChange?: (isAnonymous: boolean) => void;
  isAnonymousChangeDisabled?: boolean;
  isAnonymousEnforced?: boolean;
  selectedSkillId?: string;
  selectedSkillName?: string;
  onSkillRemove?: () => void;
  isModelChangeDisabled?: boolean;
  modelId: string | undefined;
  onModelChange: (modelId: string) => void;
  inFlight: boolean;
  canSend: boolean;
  onSend: () => void;
  onCancel: () => void;
  setMessage: Dispatch<SetStateAction<string>>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

function appendTranscription(
  setMessage: Dispatch<SetStateAction<string>>,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  text: string,
): void {
  setMessage((prev) => (prev ? `${prev} ${text}` : text));
  setTimeout(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    }
  }, 0);
}

export function ChatInputActionBar({
  isSubmitting,
  isEmbeddingModelEnabled,
  isVisionEnabled,
  knowledgeBases,
  mcpIntegrations,
  onFileUpload,
  onImageSelect,
  onAddKnowledgeBase,
  onAddIntegration,
  isAnonymous,
  onAnonymousChange,
  isAnonymousChangeDisabled,
  isAnonymousEnforced,
  selectedSkillId,
  selectedSkillName,
  onSkillRemove,
  isModelChangeDisabled,
  modelId,
  onModelChange,
  inFlight,
  canSend,
  onSend,
  onCancel,
  setMessage,
  textareaRef,
}: Readonly<ChatInputActionBarProps>) {
  const { t } = useTranslation('common');

  return (
    <ChatInputToolbar
      leading={
        <>
          <OnboardingTourTarget name={TOUR_TARGET.chatUpload} settleMs={900}>
            <PlusButton
              onFileUpload={onFileUpload}
              onImageSelect={onImageSelect}
              isFileSourceDisabled={!isEmbeddingModelEnabled || isSubmitting}
              isImageUploadDisabled={!isVisionEnabled || isSubmitting}
              onKnowledgeBaseSelect={onAddKnowledgeBase}
              attachedKnowledgeBaseIds={knowledgeBases?.map((kb) => kb.id)}
              onIntegrationSelect={onAddIntegration}
              attachedIntegrationIds={mcpIntegrations?.map(
                (integration) => integration.id,
              )}
            />
          </OnboardingTourTarget>
          <OnboardingTourTarget name={TOUR_TARGET.anonymousMode} settleMs={900}>
            <AnonymousButton
              isAnonymous={isAnonymous}
              onAnonymousChange={onAnonymousChange}
              isDisabled={isAnonymousChangeDisabled}
              isEnforced={isAnonymousEnforced}
            />
          </OnboardingTourTarget>
          {selectedSkillId && selectedSkillName && onSkillRemove && (
            <SkillBadge
              skillName={selectedSkillName}
              onRemove={() => onSkillRemove()}
            />
          )}
        </>
      }
      modelSelector={
        <TooltipIf
          condition={isModelChangeDisabled ?? false}
          tooltip={t('chatInput.modelChangeDisabledTooltip')}
        >
          <OnboardingTourTarget name={TOUR_TARGET.modelSelector}>
            <ModelSelector
              isDisabled={isModelChangeDisabled ?? false}
              selectedModelId={modelId}
              onModelChange={onModelChange}
            />
          </OnboardingTourTarget>
        </TooltipIf>
      }
      trailing={
        <>
          <MicrophoneButton
            onTranscriptionComplete={(text) => {
              appendTranscription(setMessage, textareaRef, text);
            }}
          />
          <SendButton
            inFlight={inFlight}
            canSend={canSend}
            onSend={onSend}
            onCancel={onCancel}
          />
        </>
      }
    />
  );
}
