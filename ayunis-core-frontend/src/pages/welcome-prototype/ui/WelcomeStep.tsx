import {
  ROLE_STAGES,
  WELCOME_PERSON,
  type WelcomeRole,
  type WelcomeStage,
} from '@/pages/welcome-prototype/model/welcome-prototype';
import { AppearanceScreen } from './AppearanceScreen';
import { ChapterScreen, Highlight } from './ChapterScreen';
import { ChatFlow } from './ChatFlow';
import { FinaleScreen } from './FinaleScreen';
import { ModeScreen } from './ModeScreen';
import { ModelsScreen } from './ModelsScreen';
import { SettingsScreen } from './SettingsScreen';
import { StarterScreen } from './StarterScreen';
import { CapabilitiesScreen } from './CapabilitiesScreen';
import { ToneScreen } from './ToneScreen';

function StageView({
  stage,
  chatStart,
  onNext,
  onBack,
}: Readonly<{
  stage: WelcomeStage;
  chatStart: number;
  onNext: () => void;
  onBack: () => void;
}>) {
  switch (stage) {
    case 'chapterSetup':
      return (
        <ChapterScreen
          title={
            <>
              Lassen Sie uns Ayunis Core{' '}
              <Highlight>gemeinsam einrichten.</Highlight>
            </>
          }
          onDone={onNext}
        />
      );
    case 'models':
      return <ModelsScreen onDone={onNext} onBack={onBack} />;
    case 'mode':
      return <ModeScreen onDone={onNext} onBack={onBack} />;
    case 'appearance':
      return <AppearanceScreen onDone={onNext} onBack={onBack} />;
    case 'settings':
      return <SettingsScreen onDone={onNext} onBack={onBack} />;
    case 'tone':
      return <ToneScreen onDone={onNext} onBack={onBack} />;
    case 'chapterKnow':
      return (
        <ChapterScreen
          title={
            <>
              Jetzt geht es{' '}
              <Highlight>um Sie, {WELCOME_PERSON.firstName}.</Highlight>
            </>
          }
          onDone={onNext}
        />
      );
    case 'chat':
      return <ChatFlow startStep={chatStart} onComplete={onNext} />;
    case 'chapterDiscover':
      return (
        <ChapterScreen
          title={
            <>
              Schauen wir, was Ayunis Core{' '}
              <Highlight>für Sie erledigen kann.</Highlight>
            </>
          }
          onDone={onNext}
        />
      );
    case 'capabilities':
      return (
        <CapabilitiesScreen
          startAt={chatStart}
          onDone={onNext}
          onBack={onBack}
        />
      );
    case 'starter':
      return <StarterScreen onDone={onNext} onBack={onBack} />;
    case 'finale':
      return <FinaleScreen />;
  }
}

export function WelcomeStep({
  role,
  stageIndex,
  chatStart,
  onNext,
  onBack,
}: Readonly<{
  role: WelcomeRole;
  stageIndex: number;
  chatStart: number;
  onNext: () => void;
  onBack: () => void;
}>) {
  const stage = ROLE_STAGES[role].at(stageIndex) ?? 'finale';

  return (
    <div className="wp-step">
      <StageView
        key={`${stage}-${chatStart}`}
        stage={stage}
        chatStart={chatStart}
        onNext={onNext}
        onBack={onBack}
      />
    </div>
  );
}
