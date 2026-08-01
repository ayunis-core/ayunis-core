import { Injectable } from '@nestjs/common';
import { CountTokensCommand } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.command';
import { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';

interface TurnMessage {
  role: string;
}

@Injectable()
export class CompleteTurnSelector {
  constructor(private readonly countTokensUseCase: CountTokensUseCase) {}

  select<T extends TurnMessage>(
    messages: readonly T[],
    maxTokens: number,
    extractText: (message: T) => string,
  ): T[] {
    const turns = splitIntoUserTurns(messages);
    const selected: T[][] = [];
    let totalTokens = 0;
    for (let index = turns.length - 1; index >= 0; index--) {
      const turn = turns[index];
      const turnTokens = this.countTurnTokens(turn, extractText);
      if (totalTokens + turnTokens > maxTokens) {
        break;
      }
      selected.unshift(turn);
      totalTokens += turnTokens;
    }
    return selected.flat();
  }

  private countTurnTokens<T extends TurnMessage>(
    turn: readonly T[],
    extractText: (message: T) => string,
  ): number {
    return turn.reduce((total, message) => {
      const text = extractText(message);
      if (!text) return total;
      return (
        total + this.countTokensUseCase.execute(new CountTokensCommand(text))
      );
    }, 0);
  }
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
