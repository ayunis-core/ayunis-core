import { useEffect, useState } from 'react';
import {
  ROLE_STAGES,
  subJumpOf,
  jumpOptions,
  type WelcomeGradient,
  type WelcomeJump,
  type WelcomePhase,
  type WelcomeRole,
  type WelcomeStage,
} from '@/pages/welcome-prototype/model/welcome-prototype';
import { withViewTransition } from '@/pages/welcome-prototype/model/view-transition';
import { ProductBackdrop } from './ProductBackdrop';
import { WelcomeLogoIntro } from './WelcomeLogoIntro';
import { WelcomeStep } from './WelcomeStep';
import { PrototypeControls } from './PrototypeControls';
import './welcome-prototype.css';

const LEAVE_MS = 1250;

export function WelcomePrototypePage() {
  const [role, setRole] = useState<WelcomeRole>('admin');
  const [gradient, setGradient] = useState<WelcomeGradient>('product');
  const [phase, setPhase] = useState<WelcomePhase>('intro');
  const [runKey, setRunKey] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [chatStart, setChatStart] = useState(0);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const timeoutId = window.setTimeout(() => setPhase('step'), LEAVE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [phase]);

  function restart() {
    setChatStart(0);
    setPhase('intro');
    setStageIndex(0);
    setRunKey((key) => key + 1);
  }

  function jump(target: WelcomeJump) {
    if (target === 'intro') {
      restart();
      return;
    }
    const sub = subJumpOf(target);
    setChatStart(sub?.start ?? 0);
    const stage = sub ? sub.stage : (target as WelcomeStage);
    setStageIndex(Math.max(0, ROLE_STAGES[role].indexOf(stage)));
    setPhase('step');
    setRunKey((key) => key + 1);
  }

  const currentStage = ROLE_STAGES[role].at(stageIndex) ?? 'chat';
  const subPrefix: Partial<Record<WelcomeStage, string>> = {
    chat: 'chat',
    capabilities: 'cap',
  };
  const prefix = subPrefix[currentStage];
  const stageJump = (
    prefix && chatStart > 0 ? `${prefix}:${chatStart}` : currentStage
  ) as WelcomeJump;
  const currentJump: WelcomeJump = phase === 'step' ? stageJump : 'intro';

  function changeRole(next: WelcomeRole) {
    setRole(next);
    restart();
  }

  function changeGradient(next: WelcomeGradient) {
    setGradient(next);
    restart();
  }

  return (
    <div className="welcome-prototype bg-background text-foreground">
      <div key={runKey} className="wp-stage" data-phase={phase}>
        <ProductBackdrop gradient={gradient} />
        {phase !== 'step' && (
          <WelcomeLogoIntro onStart={() => setPhase('leaving')} />
        )}
        {phase === 'step' && (
          <WelcomeStep
            role={role}
            stageIndex={stageIndex}
            chatStart={chatStart}
            onNext={() =>
              withViewTransition(() => setStageIndex((current) => current + 1))
            }
            onBack={() =>
              stageIndex === 0
                ? restart()
                : withViewTransition(() =>
                    setStageIndex((current) => current - 1),
                  )
            }
          />
        )}
      </div>
      <PrototypeControls
        step={currentJump}
        stepOptions={jumpOptions(role)}
        onStepChange={jump}
        role={role}
        gradient={gradient}
        onRoleChange={changeRole}
        onGradientChange={changeGradient}
        onRestart={restart}
      />
    </div>
  );
}
