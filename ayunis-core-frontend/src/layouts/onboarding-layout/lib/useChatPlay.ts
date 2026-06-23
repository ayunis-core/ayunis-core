import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './prefersReducedMotion';

export type ChatStage = 'typing' | 'thinking' | 'answer' | 'sent';

export function useChatPlay(prompt: string, active: boolean, startDelayMs = 0) {
  const reduced = prefersReducedMotion();
  const [stage, setStage] = useState<ChatStage>(reduced ? 'sent' : 'typing');
  const [typed, setTyped] = useState(reduced ? prompt : '');
  const timer = useRef<number>(0);

  useEffect(() => {
    if (reduced || !active) {
      return;
    }
    let char = 0;
    let phase: ChatStage = 'typing';

    const run = () => {
      if (phase === 'typing' && char < prompt.length) {
        char += 1;
        setTyped(prompt.slice(0, char));
        timer.current = window.setTimeout(
          run,
          char >= prompt.length ? 700 : 42,
        );
      } else if (phase === 'typing') {
        phase = 'thinking';
        setStage('thinking');
        timer.current = window.setTimeout(run, 1800);
      } else if (phase === 'thinking') {
        phase = 'answer';
        setStage('answer');
        timer.current = window.setTimeout(run, 2000);
      } else if (phase === 'answer') {
        phase = 'sent';
        setStage('sent');
      }
    };

    timer.current = window.setTimeout(() => {
      setStage('typing');
      setTyped('');
      run();
    }, startDelayMs);
    return () => window.clearTimeout(timer.current);
  }, [active, prompt, reduced, startDelayMs]);

  return { stage, typed };
}
