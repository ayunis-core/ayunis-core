import { useRef, type KeyboardEvent } from 'react';
import { flushSync } from 'react-dom';

const STEP_BY_KEY: Partial<Record<string, number>> = {
  ArrowUp: -1,
  ArrowDown: 1,
};

// Row breaks (explicit or soft-wrapped) are only known to the browser, which
// moves the caret to the text's start/end from the first/last row. Recall
// therefore waits until the caret sits on that edge of the whole text.
function isCaretAtEdge(textarea: HTMLTextAreaElement, step: number) {
  const { value, selectionStart, selectionEnd } = textarea;
  return step < 0 ? selectionEnd === 0 : selectionStart === value.length;
}

// Leaving the caret at the edge allows repeated presses to continue recall.
function moveCaretToEdge(textarea: HTMLTextAreaElement, step: number) {
  const caret = step < 0 ? 0 : textarea.value.length;
  textarea.setSelectionRange(caret, caret);
}

function recallStep(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.nativeEvent.isComposing) return;
  if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
  return STEP_BY_KEY[event.key];
}

export function usePromptHistory(
  message: string,
  setMessage: (message: string) => void,
  prompts: readonly string[],
) {
  const recalledIndex = useRef<number | null>(null);

  // Only an empty composer or an untouched recalled prompt reacts, so arrow
  // keys keep moving the caret inside a draft the user is writing.
  return (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const step = recallStep(event);
    if (step === undefined) return;
    const textarea = event.currentTarget;
    const index = recalledIndex.current;
    const isRecalling = index !== null && prompts[index] === message;
    if (!isRecalling && message !== '') return;
    if (!isCaretAtEdge(textarea, step)) return;

    const next = (isRecalling ? index : prompts.length) + step;
    if (next < 0 || next > prompts.length) return;
    event.preventDefault();
    recalledIndex.current = next < prompts.length ? next : null;
    flushSync(() => setMessage(prompts[next] ?? ''));
    moveCaretToEdge(textarea, step);
  };
}
