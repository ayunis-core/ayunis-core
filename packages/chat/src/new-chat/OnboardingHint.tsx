import { ArrowRight, Brain, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { cn } from '@ayunis/ui/lib/cn';
import type { OnboardingStage } from '@ayunis/api-client/schemas';
import './onboarding-hint.css';

const STAGE_ICON = { profile: Brain, first_skill: Sparkles };

interface OnboardingHintProps {
  readonly stage: OnboardingStage;
  readonly disabled: boolean;
  readonly onStart: () => void;
  readonly className?: string;
}

export function OnboardingHint({
  stage,
  disabled,
  onStart,
  className,
}: Readonly<OnboardingHintProps>) {
  const { t } = useTranslation('chat');
  const Icon = STAGE_ICON[stage];

  return (
    <Item
      asChild
      variant="outline"
      size="sm"
      className={cn(
        'onboarding-hint w-full border-brand/40 bg-brand/10 text-left enabled:hover:bg-brand/20 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onStart}
        data-testid="new-chat-onboarding-hint"
        data-stage={stage}
      >
        <ItemMedia variant="icon" className="text-brand">
          <Icon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{t(`newChat.onboardingHint.${stage}.title`)}</ItemTitle>
          <ItemDescription className="line-clamp-none">
            {t(`newChat.onboardingHint.${stage}.description`)}
          </ItemDescription>
        </ItemContent>
        <ArrowRight className="onboarding-hint__arrow size-4 shrink-0 text-brand" />
      </button>
    </Item>
  );
}
