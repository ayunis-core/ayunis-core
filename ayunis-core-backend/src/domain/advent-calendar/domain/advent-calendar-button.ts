export enum AdventCalendarButtonKind {
  LINK = 'link',
  PROMPT = 'prompt',
  QUIZ = 'quiz',
}

/** An http(s) URL opens in a new tab, an in-app path in the same tab. */
export interface AdventCalendarLinkButton {
  readonly kind: AdventCalendarButtonKind.LINK;
  readonly label: string;
  readonly url: string;
}

/** Opens a new chat with the prompt in the input field, unsent. */
export interface AdventCalendarPromptButton {
  readonly kind: AdventCalendarButtonKind.PROMPT;
  readonly label: string;
  readonly prompt: string;
}

export interface AdventCalendarQuizButton {
  readonly kind: AdventCalendarButtonKind.QUIZ;
  readonly label: string;
  readonly question: string;
  readonly answers: readonly string[];
  readonly correctAnswerIndex: number;
  readonly explanation: string | null;
}

export type AdventCalendarButton =
  | AdventCalendarLinkButton
  | AdventCalendarPromptButton
  | AdventCalendarQuizButton;

function parseUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

/**
 * An absolute http(s) URL, or an in-app path starting with a single `/`.
 * Browsers resolve `//host` and, reading a backslash as a slash, `/\host` to
 * another host, so backslashes, whitespace and control characters are refused.
 */
export function isAdventCalendarLinkUrl(value: string): boolean {
  // eslint-disable-next-line no-control-regex -- control characters are what it rejects
  if (/[\\\u0000-\u001f\u007f]/.test(value) || /\s/.test(value)) {
    return false;
  }
  if (value.startsWith('/')) return !value.startsWith('//');
  const url = parseUrl(value);
  return (
    url !== null &&
    (url.protocol === 'https:' || url.protocol === 'http:') &&
    url.hostname.length > 0
  );
}
