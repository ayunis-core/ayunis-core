import { useTranslation } from 'react-i18next';
import { cn } from '@ayunis/ui/lib/cn';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import ModelSelector from './ModelSelector';
import { MicrophoneButton } from './MicrophoneButton';
import { SendButton } from './SendButton';

interface ChatInputSendControlsProps {
  isModelChangeDisabled?: boolean;
  modelId: string | undefined;
  onModelChange: (modelId: string) => void;
  isEmbedded: boolean;
  onTranscriptionComplete: (text: string) => void;
  inFlight: boolean;
  canSend: boolean;
  onSend: () => void;
  onCancel: () => void;
}

export function ChatInputSendControls({
  isModelChangeDisabled,
  modelId,
  onModelChange,
  isEmbedded,
  onTranscriptionComplete,
  inFlight,
  canSend,
  onSend,
  onCancel,
}: Readonly<ChatInputSendControlsProps>) {
  const { t } = useTranslation('common');
  return (
    <div className="flex-shrink-0 flex space-x-2">
      {/* Below the narrowest task-pane width the model selector is dropped
          entirely so the remaining controls never collide. */}
      <span className={cn('contents', isEmbedded && '@max-[17rem]:hidden')}>
        <TooltipIf
          condition={isModelChangeDisabled ?? false}
          tooltip={t('chatInput.modelChangeDisabledTooltip')}
        >
          <OnboardingTourTarget name={TOUR_TARGET.modelSelector}>
            <ModelSelector
              isDisabled={isModelChangeDisabled ?? false}
              selectedModelId={modelId}
              onModelChange={onModelChange}
              responsiveLabel={isEmbedded}
            />
          </OnboardingTourTarget>
        </TooltipIf>
      </span>
      <MicrophoneButton onTranscriptionComplete={onTranscriptionComplete} />
      <SendButton
        inFlight={inFlight}
        canSend={canSend}
        onSend={onSend}
        onCancel={onCancel}
      />
    </div>
  );
}
