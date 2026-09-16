import { useState, type KeyboardEvent, type RefObject } from 'react';
import type { SkillOption } from '@/widgets/chat-input/api/useSkillOptions';
import {
  matchSkills,
  readSlashToken,
  removeSlashToken,
  type SlashToken,
} from './slashToken';

interface UseSkillSlashMenuParams {
  message: string;
  setMessage: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  skills: SkillOption[];
  onSkillSelect?: (skill: SkillOption) => void;
  isEnabled: boolean;
}

export function useSkillSlashMenu({
  message,
  setMessage,
  textareaRef,
  skills,
  onSkillSelect,
  isEnabled,
}: Readonly<UseSkillSlashMenuParams>) {
  const [token, setToken] = useState<SlashToken | null>(null);
  const [dismissedQuery, setDismissedQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = token ? matchSkills(skills, token.query) : [];
  const isOpen =
    isEnabled &&
    token !== null &&
    matches.length > 0 &&
    dismissedQuery !== token.query;
  const safeIndex = Math.min(activeIndex, Math.max(matches.length - 1, 0));

  function syncFromCaret() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const next = readSlashToken(textarea.value, textarea.selectionStart);
    setToken(next);
    setActiveIndex(0);
    if (next === null) {
      setDismissedQuery(null);
      return;
    }
    if (next.query !== dismissedQuery) setDismissedQuery(null);
  }

  function close() {
    setDismissedQuery(token?.query ?? null);
  }

  function select(skill: SkillOption) {
    if (!token) return;
    const caret = token.start;
    setMessage(removeSlashToken(textareaRef.current?.value ?? message, token));
    setToken(null);
    setDismissedQuery(null);
    onSkillSelect?.(skill);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!isOpen) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % matches.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + matches.length) % matches.length);
      return;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      select(matches[safeIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  return {
    isOpen,
    matches,
    activeIndex: safeIndex,
    setActiveIndex,
    syncFromCaret,
    handleKeyDown,
    select,
    close,
  };
}
