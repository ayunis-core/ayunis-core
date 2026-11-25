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
import { OverviewScreen } from './OverviewScreen';
import { RoutineScreen } from './RoutineScreen';
import { SettingsScreen } from './SettingsScreen';
import { SkillsDemoScreen } from './SkillsDemoScreen';
import { ToneScreen } from './ToneScreen';

const KNOW_TITLE = `Jetzt geht es um Sie, ${WELCOME_PERSON.firstName}.`;

function StageView({
  stage,
  onNext,
  onBack,
}: Readonly<{
  stage: WelcomeStage;
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
          transitionName="wp-chat-hero"
          onDone={onNext}
        />
      );
    case 'chat':
      return <ChatFlow heroText={KNOW_TITLE} onComplete={onNext} />;
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
    case 'skills':
      return <SkillsDemoScreen onDone={onNext} onBack={onBack} />;
    case 'routine':
      return <RoutineScreen onDone={onNext} onBack={onBack} />;
    case 'overview':
      return <OverviewScreen onDone={onNext} onBack={onBack} />;
    case 'finale':
      return <FinaleScreen />;
  }
}

export function WelcomeStep({
  role,
  stageIndex,
  onNext,
  onBack,
}: Readonly<{
  role: WelcomeRole;
  stageIndex: number;
  onNext: () => void;
  onBack: () => void;
}>) {
  const stage = ROLE_STAGES[role].at(stageIndex) ?? 'finale';

  return (
    <div className="wp-step">
      <StageView key={stage} stage={stage} onNext={onNext} onBack={onBack} />
    </div>
  );
}
