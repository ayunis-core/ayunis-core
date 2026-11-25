import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CHAT_SCRIPT,
  type ChatFact,
  type ChatMessage,
  type ChatStep,
} from './chat-script';
import { acknowledge } from './chat-acknowledgements';
import { withViewTransition } from './view-transition';

const HERO_HOLD_MS = 900;
const AFTER_MORPH_MS = 1100;
const TYPING_MS = 1100;
const SAY_PAUSE_MS = 1300;

function factsFrom(answers: Partial<Record<string, string>>): ChatFact[] {
  return CHAT_SCRIPT.flatMap((step) => {
    if (step.kind !== 'question') return [];
    const value = answers[step.question.id];
    return value ? [{ label: step.question.label, value }] : [];
  });
}

function messageFor(
  step: ChatStep,
  index: number,
  lead: string | undefined,
  answers: Partial<Record<string, string>>,
): Omit<ChatMessage, 'id'> {
  switch (step.kind) {
    case 'say':
      return { role: 'assistant', text: step.text, lead };
    case 'question':
      return {
        role: 'assistant',
        text: step.question.title,
        note: step.question.note,
        lead,
      };
    case 'memory':
      return {
        role: 'assistant',
        text: step.text,
        lead,
        facts: factsFrom(answers),
        stepIndex: index,
      };
  }
}

export function useChatScript(heroText: string) {
  const [phase, setPhase] = useState<'hero' | 'chat'>('hero');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stepIndex, setStepIndex] = useState(-1);
  const [typing, setTyping] = useState(false);
  const timers = useRef<number[]>([]);
  const answers = useRef<Partial<Record<string, string>>>({});
  const nextId = useRef(1);

  const later = useCallback((callback: () => void, ms: number) => {
    timers.current.push(window.setTimeout(callback, ms));
  }, []);

  const push = useCallback((message: Omit<ChatMessage, 'id'>) => {
    const id = nextId.current;
    nextId.current += 1;
    setMessages((current) => [...current, { ...message, id }]);
  }, []);

  const ask = useCallback(
    (index: number, lead?: string) => {
      const step = CHAT_SCRIPT.at(index);
      if (!step) return;
      setTyping(true);
      later(() => {
        setTyping(false);
        setStepIndex(index);
        push(messageFor(step, index, lead, answers.current));
      }, TYPING_MS);
    },
    [later, push],
  );

  useEffect(() => {
    if (typing || stepIndex < 0) return;
    if (CHAT_SCRIPT.at(stepIndex)?.kind !== 'say') return;
    later(() => ask(stepIndex + 1), SAY_PAUSE_MS);
  }, [ask, later, stepIndex, typing]);

  useEffect(() => {
    const pending = timers.current;
    later(() => {
      withViewTransition(() => {
        setPhase('chat');
        setMessages([
          { id: 0, role: 'assistant', text: heroText, isHero: true },
        ]);
      });
      later(() => ask(0), AFTER_MORPH_MS);
    }, HERO_HOLD_MS);
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, [ask, heroText, later]);

  const answer = useCallback(
    (text: string) => {
      const step = CHAT_SCRIPT.at(stepIndex);
      if (step?.kind === 'question') answers.current[step.question.id] = text;
      push({ role: 'user', text });
      ask(stepIndex + 1, acknowledge(step, text));
    },
    [ask, push, stepIndex],
  );

  return {
    phase,
    messages,
    typing,
    currentStep:
      !typing && stepIndex >= 0 ? CHAT_SCRIPT.at(stepIndex) : undefined,
    answer,
  };
}
