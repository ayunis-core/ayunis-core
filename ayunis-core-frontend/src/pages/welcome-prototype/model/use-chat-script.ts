import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CHAT_SCRIPT,
  type ChatFact,
  type ChatMessage,
  type ChatStep,
} from './chat-script';
import { acknowledge } from './chat-acknowledgements';

const START_MS = 700;
const TYPING_MS = 1100;
const SAY_PAUSE_MS = 1300;
const MEMORY_PAUSE_MS = 3200;

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
    case 'finish':
      return { role: 'assistant', text: step.text, lead };
    case 'question':
      return {
        role: 'assistant',
        text: `**${step.question.title}**`,
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

function prefill(startStep: number) {
  const answers: Partial<Record<string, string>> = {};
  const messages: ChatMessage[] = [];
  CHAT_SCRIPT.slice(0, startStep).forEach((step, index) => {
    messages.push({
      ...messageFor(step, index, undefined, answers),
      instant: true,
      id: -2 * index - 2,
    });
    if (step.kind !== 'question') return;
    const answer = step.question.options[0] ?? '';
    answers[step.question.id] = answer;
    messages.push({ role: 'user', text: answer, id: -2 * index - 3 });
  });
  return { answers, messages };
}

export function useChatScript(startStep: number) {
  const [initial] = useState(() => prefill(startStep));
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages);
  const [stepIndex, setStepIndex] = useState(-1);
  const [typing, setTyping] = useState(false);
  const timers = useRef<number[]>([]);
  const answers = useRef<Partial<Record<string, string>>>(initial.answers);
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
    const kind = CHAT_SCRIPT.at(stepIndex)?.kind;
    if (kind !== 'say' && kind !== 'memory') return;
    later(
      () => ask(stepIndex + 1),
      kind === 'memory' ? MEMORY_PAUSE_MS : SAY_PAUSE_MS,
    );
  }, [ask, later, stepIndex, typing]);

  useEffect(() => {
    const pending = timers.current;
    later(() => ask(startStep), START_MS);
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, [ask, later, startStep]);

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
    messages,
    typing,
    currentStep:
      !typing && stepIndex >= 0 ? CHAT_SCRIPT.at(stepIndex) : undefined,
    answer,
  };
}
