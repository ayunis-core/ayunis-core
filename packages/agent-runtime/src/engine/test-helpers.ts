import type { RunEvent } from '../contracts/event';
import type { Message } from '../contracts/message';
import type { RunInput } from '../contracts/run-input';
import type { Tool } from '../contracts/tool';
import type { MockProvider } from '../providers/mock/mock-provider';
import { run } from './run';

export const userMessage = (text: string): Message => ({
  role: 'user',
  content: [{ type: 'text', text }],
});

export const echoTool = (overrides: Partial<Tool> = {}): Tool => ({
  name: 'echo',
  description: 'Echoes the input back',
  parameters: {
    type: 'object',
    properties: { value: { type: 'string' } },
  },
  execute: (input) => `echo: ${String(input.value)}`,
  ...overrides,
});

export const collectEvents = async (input: RunInput): Promise<RunEvent[]> => {
  const events: RunEvent[] = [];
  for await (const event of run(input)) {
    events.push(event);
  }
  return events;
};

export const eventTypes = (events: readonly RunEvent[]): string[] => {
  return events.map((event) => event.type);
};

export const baseInput = (
  model: MockProvider,
  overrides: Partial<RunInput> = {},
): RunInput => {
  return {
    instructions: 'Be helpful.',
    model,
    messages: [userMessage('Hi')],
    ...overrides,
  };
};
