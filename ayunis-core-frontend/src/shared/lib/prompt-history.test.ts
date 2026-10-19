import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearPromptHistory,
  getSentPrompts,
  recordSentPrompt,
  setPromptHistoryOwner,
} from '@/shared/lib/prompt-history';

describe('prompt history', () => {
  beforeEach(() => clearPromptHistory());

  it('keeps prompts while the same user stays signed in', () => {
    setPromptHistoryOwner('clerk-a');
    recordSentPrompt('Who approved the building permit?');
    setPromptHistoryOwner('clerk-a');

    expect(getSentPrompts()).toEqual(['Who approved the building permit?']);
  });

  it('drops prompts when a different user signs in', () => {
    setPromptHistoryOwner('clerk-a');
    recordSentPrompt('Who approved the building permit?');
    setPromptHistoryOwner('clerk-b');

    expect(getSentPrompts()).toEqual([]);
  });
});
