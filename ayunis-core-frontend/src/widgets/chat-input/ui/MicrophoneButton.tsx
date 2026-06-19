import { Mic, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { useTranslation } from 'react-i18next';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { useTranscribe } from '../api/useTranscribe';
import { showError } from '@/shared/lib/toast';
import { cn } from '@/shared/lib/shadcn/utils';
import { TOUR_TARGET } from '@/shared/config/tour-targets';
import { OnboardingTourTarget } from '@/features/onboarding-tour';

interface MicrophoneButtonProps {
  onTranscriptionComplete: (text: string) => void;
}

export function MicrophoneButton({
  onTranscriptionComplete,
}: Readonly<MicrophoneButtonProps>) {
  const { t } = useTranslation('common');
  const { transcribe, isTranscribing: isApiTranscribing } = useTranscribe();

  const handleError = (errorKey: string) => {
    showError(t(errorKey));
  };

  const {
    isStarting,
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    isSupported,
  } = useVoiceRecording(onTranscriptionComplete, handleError, transcribe);

  if (!isSupported) {
    return null;
  }

  const busy = isStarting || isTranscribing || isApiTranscribing;

  const handleClick = () => {
    if (busy) return;
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  };

  let tooltipText: string;
  if (busy) {
    tooltipText = t('chatInput.transcribing');
  } else if (isRecording) {
    tooltipText = t('chatInput.microphoneRecording');
  } else {
    tooltipText = t('chatInput.microphoneTooltip');
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <OnboardingTourTarget name={TOUR_TARGET.voiceInput}>
            <Button
              variant={isRecording ? 'destructive' : 'outline'}
              size="icon"
              className={cn('rounded-full', isRecording && 'animate-pulse')}
              onClick={handleClick}
              disabled={busy}
              aria-label={tooltipText}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </OnboardingTourTarget>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
