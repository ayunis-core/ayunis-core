import {
  AgentRuntimeError,
  type Hook,
  type Message,
  type MessageContent,
} from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import { CountTokensCommand } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.command';
import { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';

interface ContextBudgetHookParams {
  maxTokens: number;
}

@Injectable()
export class ContextBudgetHookFactory {
  constructor(private readonly countTokensUseCase: CountTokensUseCase) {}

  create(params: ContextBudgetHookParams): Hook {
    return {
      name: 'ayunis-context-budget',
      beforeModelCall: (ctx) => {
        ctx.transformMessages((messages) =>
          this.trimToCompleteTurns(messages, params.maxTokens),
        );
      },
    };
  }

  private trimToCompleteTurns(
    messages: readonly Message[],
    maxTokens: number,
  ): Message[] {
    const turns = splitIntoUserTurns(messages);
    const selected: Message[][] = [];
    let totalTokens = 0;
    for (let index = turns.length - 1; index >= 0; index--) {
      const turn = turns[index];
      const turnTokens = this.countTurnTokens(turn);
      if (totalTokens + turnTokens > maxTokens) {
        break;
      }
      selected.unshift(turn);
      totalTokens += turnTokens;
    }
    if (selected.length === 0) {
      throw contextBudgetExceeded();
    }
    return selected.flat();
  }

  private countTurnTokens(turn: Message[]): number {
    return turn.reduce((total, message) => {
      const text = message.content
        .map(extractRuntimeContentText)
        .filter(Boolean)
        .join('\n');
      if (!text) {
        return total;
      }
      return (
        total + this.countTokensUseCase.execute(new CountTokensCommand(text))
      );
    }, 0);
  }
}

function splitIntoUserTurns(messages: readonly Message[]): Message[][] {
  const turns: Message[][] = [];
  for (const message of messages) {
    if (message.role === 'user') {
      turns.push([message]);
    } else {
      turns.at(-1)?.push(message);
    }
  }
  return turns;
}

function extractRuntimeContentText(content: MessageContent): string {
  switch (content.type) {
    case 'text':
      return content.text;
    case 'thinking':
      return content.thinking;
    case 'tool_use':
      return `${content.id} ${content.name} ${JSON.stringify(content.input)}`;
    case 'tool_result':
      return `${content.toolCallId} ${content.toolName} ${content.result}`;
    case 'image':
      return '';
  }
}

function contextBudgetExceeded(): AgentRuntimeError {
  return new AgentRuntimeError(
    'CONTEXT_BUDGET_EXCEEDED',
    'The latest conversation turn exceeds the model context budget',
  );
}
