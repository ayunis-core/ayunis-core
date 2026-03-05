import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Sparkles } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import { Card, CardContent, CardFooter } from '@/shared/ui/shadcn/card';
import { Alert, AlertTitle, AlertDescription } from '@/shared/ui/shadcn/alert';
import { useGeneratePersonalizedSystemPrompt } from '../api/useGeneratePersonalizedSystemPrompt';
import {
  PersonalizationStepper,
  PERSONALIZATION_TOTAL_STEPS,
} from './personalization/PersonalizationStepper';
import { PersonalizationStepName } from './personalization/PersonalizationStepName';
import {
  PersonalizationStepStyle,
  STYLE_OPTIONS,
} from './personalization/PersonalizationStepStyle';
import { PersonalizationStepContext } from './personalization/PersonalizationStepContext';

type CardState =
  | { type: 'wizard'; step: number }
  | { type: 'loading' }
  | { type: 'error' }
  | { type: 'success'; welcomeMessage: string };

interface PersonalizationCardProps {
  onSkip: () => void;
  isSkipping: boolean;
  onComplete: () => void | Promise<void>;
}

export function PersonalizationCard({
  onSkip,
  isSkipping,
  onComplete,
}: Readonly<PersonalizationCardProps>) {
  const { t } = useTranslation('chat');

  const [name, setName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [customStyle, setCustomStyle] = useState('');
  const [workContext, setWorkContext] = useState('');
  const [cardState, setCardState] = useState<CardState>({
    type: 'wizard',
    step: 1,
  });

  const { generate, isGenerating } = useGeneratePersonalizedSystemPrompt({
    onSuccess: (data) => {
      setCardState({ type: 'success', welcomeMessage: data.welcomeMessage });
    },
    onError: () => {
      setCardState({ type: 'error' });
    },
  });

  function buildCommunicationStyle(): string | undefined {
    const parts: string[] = [];
    if (selectedStyle) {
      const option = STYLE_OPTIONS.find((o) => o.key === selectedStyle);
      const label = option ? t(option.i18nKey) : selectedStyle;
      parts.push(label);
    }
    if (customStyle.trim()) parts.push(customStyle.trim());
    return parts.length > 0 ? parts.join('. ') : undefined;
  }

  function handleSubmit() {
    setCardState({ type: 'loading' });
    generate({
      preferredName: name.trim(),
      communicationStyle: buildCommunicationStyle(),
      workContext: workContext.trim() || undefined,
    });
  }

  function handleRetry() {
    setCardState({ type: 'wizard', step: PERSONALIZATION_TOTAL_STEPS });
  }

  const isNameValid = name.trim().length > 0;
  const isStyleValid = selectedStyle.length > 0;
  const isBusy = isSkipping || isGenerating;

  if (cardState.type === 'loading') {
    return <LoadingState message={t('newChat.personalization.generating')} />;
  }

  if (cardState.type === 'error') {
    return (
      <ErrorState
        message={t('newChat.personalization.errorMessage')}
        onRetry={handleRetry}
      />
    );
  }

  if (cardState.type === 'success') {
    return (
      <SuccessState
        welcomeMessage={cardState.welcomeMessage}
        onGetStarted={onComplete}
      />
    );
  }

  const { step } = cardState;

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardContent className="flex flex-col gap-6">
        <PersonalizationStepper currentStep={step} />
        {step === 1 && (
          <PersonalizationStepName name={name} onNameChange={setName} />
        )}
        {step === 2 && (
          <PersonalizationStepStyle
            selectedStyle={selectedStyle}
            onStyleChange={setSelectedStyle}
            customStyle={customStyle}
            onCustomStyleChange={setCustomStyle}
          />
        )}
        {step === 3 && (
          <PersonalizationStepContext
            context={workContext}
            onContextChange={setWorkContext}
          />
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={onSkip} disabled={isBusy}>
          {t('newChat.personalization.skip')}
        </Button>
        <div className="flex gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCardState({ type: 'wizard', step: step - 1 })}
            >
              {t('newChat.personalization.back')}
            </Button>
          )}
          {step < PERSONALIZATION_TOTAL_STEPS && (
            <Button
              size="sm"
              disabled={
                (step === 1 && !isNameValid) || (step === 2 && !isStyleValid)
              }
              onClick={() => setCardState({ type: 'wizard', step: step + 1 })}
            >
              {t('newChat.personalization.next')}
            </Button>
          )}
          {step === PERSONALIZATION_TOTAL_STEPS && (
            <Button size="sm" onClick={handleSubmit} disabled={isBusy}>
              <Sparkles className="h-4 w-4" />
              {t('newChat.personalization.submit')}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

function LoadingState({ message }: Readonly<{ message: string }>) {
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardContent className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

function ErrorState({
  message,
  onRetry,
}: Readonly<{ message: string; onRetry: () => void }>) {
  const { t } = useTranslation('chat');
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardContent className="flex flex-col items-center gap-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('newChat.personalization.errorTitle')}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('newChat.personalization.retry')}
        </Button>
      </CardContent>
    </Card>
  );
}

function SuccessState({
  welcomeMessage,
  onGetStarted,
}: Readonly<{
  welcomeMessage: string;
  onGetStarted: () => void | Promise<void>;
}>) {
  const { t } = useTranslation('chat');
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardContent className="flex flex-col items-center gap-4 py-8">
        <p className="text-center text-sm">{welcomeMessage}</p>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button onClick={() => void onGetStarted()}>
          {t('newChat.personalization.getStarted')}
        </Button>
      </CardFooter>
    </Card>
  );
}
