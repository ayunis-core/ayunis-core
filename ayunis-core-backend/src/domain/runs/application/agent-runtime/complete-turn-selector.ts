interface TurnMessage {
  role: string;
}

export interface TurnSelectionOptions<T> {
  maxTokens: number;
  countTokens: (message: T) => number;
}

export interface TurnSelection<T> {
  messages: T[];
  /** Tokens of the selected messages, as counted by `countTokens`. */
  tokens: number;
}

/**
 * Keeps the newest complete user turns (a user message with everything up to
 * the next one) whose token total stays within the budget.
 */
export function selectCompleteTurns<T extends TurnMessage>(
  messages: readonly T[],
  options: TurnSelectionOptions<T>,
): TurnSelection<T> {
  const turns = splitIntoUserTurns(messages);
  const selected: T[][] = [];
  let totalTokens = 0;
  for (let index = turns.length - 1; index >= 0; index--) {
    const turn = turns[index];
    const turnTokens = turn.reduce(
      (total, message) => total + options.countTokens(message),
      0,
    );
    if (totalTokens + turnTokens > options.maxTokens) {
      break;
    }
    selected.unshift(turn);
    totalTokens += turnTokens;
  }
  return { messages: selected.flat(), tokens: totalTokens };
}

function splitIntoUserTurns<T extends TurnMessage>(
  messages: readonly T[],
): T[][] {
  const turns: T[][] = [];
  for (const message of messages) {
    if (message.role === 'user') {
      turns.push([message]);
    } else {
      turns.at(-1)?.push(message);
    }
  }
  return turns;
}
