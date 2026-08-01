import {
  AgentRuntimeError,
  type Hook,
  type Message,
  type MessageContent,
} from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import { CompleteTurnSelector } from '../complete-turn-selector';

interface ContextBudgetHookParams {
  maxTokens: number;
}

@Injectable()
export class ContextBudgetHookFactory {
  constructor(private readonly completeTurnSelector: CompleteTurnSelector) {}

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
    const selected = this.completeTurnSelector.select(
      messages,
      maxTokens,
      extractRuntimeMessageText,
    );
    if (selected.length === 0) {
      throw contextBudgetExceeded();
    }
    return selected;
  }
}

function extractRuntimeMessageText(message: Message): string {
  return message.content
    .map(extractRuntimeContentText)
    .filter(Boolean)
    .join('\n');
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
