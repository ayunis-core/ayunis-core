import { describe, it, expect } from 'vitest';
import { groupMessagesIntoRuns } from './group-messages-into-runs';
import type { Message } from '@/pages/chat/model/openapi';

interface AssistantContentBlock {
  type: 'text' | 'thinking' | 'tool_use';
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  params?: Record<string, unknown>;
}

let idCounter = 0;
const nextId = () => `msg-${++idCounter}`;

function userMessage(text: string): Message {
  return {
    id: nextId(),
    role: 'user',
    content: [{ type: 'text', text }],
    createdAt: new Date().toISOString(),
  } as unknown as Message;
}

function assistantMessage(blocks: AssistantContentBlock[]): Message {
  return {
    id: nextId(),
    role: 'assistant',
    content: blocks.map((block) => {
      if (block.type === 'text') return { type: 'text', text: block.text };
      if (block.type === 'thinking')
        return { type: 'thinking', thinking: block.thinking };
      return {
        type: 'tool_use',
        id: block.id,
        name: block.name,
        params: block.params ?? {},
      };
    }),
    createdAt: new Date().toISOString(),
  } as unknown as Message;
}

function toolResultMessage(toolId: string, result: string): Message {
  return {
    id: nextId(),
    role: 'tool',
    content: [{ type: 'tool_result', toolId, toolName: 'noop', result }],
    createdAt: new Date().toISOString(),
  } as unknown as Message;
}

describe('groupMessagesIntoRuns', () => {
  it('returns empty array for empty input', () => {
    const result = groupMessagesIntoRuns([], {
      isStreaming: false,
      toolResultsByToolId: {},
    });
    expect(result).toEqual([]);
  });

  it('emits a user unit for each user message', () => {
    const messages = [userMessage('hello'), userMessage('world')];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: false,
      toolResultsByToolId: {},
    });
    expect(units).toHaveLength(2);
    expect(units[0].kind).toBe('user');
    expect(units[1].kind).toBe('user');
  });

  it('groups assistant text reply as a single agent-run with finalText', () => {
    const messages = [
      userMessage('hi'),
      assistantMessage([{ type: 'text', text: 'hello!' }]),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: false,
      toolResultsByToolId: {},
    });
    expect(units).toHaveLength(2);
    expect(units[0].kind).toBe('user');
    const run = units[1];
    expect(run.kind).toBe('agent-run');
    if (run.kind !== 'agent-run') return;
    expect(run.steps).toHaveLength(0);
    expect(run.finalText).toHaveLength(1);
    expect(run.finalText[0].text).toBe('hello!');
    expect(run.isStreaming).toBe(false);
  });

  it('groups multi-iteration loop into a single agent-run', () => {
    const messages = [
      userMessage('do work'),
      assistantMessage([
        { type: 'thinking', thinking: 'planning' },
        { type: 'tool_use', id: 't1', name: 'web_search' },
      ]),
      toolResultMessage('t1', 'search results'),
      assistantMessage([{ type: 'tool_use', id: 't2', name: 'read_document' }]),
      toolResultMessage('t2', 'doc body'),
      assistantMessage([{ type: 'text', text: 'done!' }]),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: false,
      toolResultsByToolId: { t1: 'search results', t2: 'doc body' },
    });
    expect(units).toHaveLength(2);
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.steps).toHaveLength(3); // thinking + 2 tool calls
    expect(run.steps[0].kind).toBe('thinking');
    expect(run.steps[1].kind).toBe('tool');
    expect(run.steps[2].kind).toBe('tool');
    expect(run.steps[1].status).toBe('done');
    expect(run.steps[2].status).toBe('done');
    expect(run.finalText[0].text).toBe('done!');
  });

  it('marks tool steps without results as in_progress', () => {
    const messages = [
      userMessage('go'),
      assistantMessage([{ type: 'tool_use', id: 't1', name: 'web_search' }]),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: true,
      toolResultsByToolId: {},
    });
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.steps[0].kind).toBe('tool');
    expect(run.steps[0].status).toBe('in_progress');
    expect(run.isStreaming).toBe(true);
  });

  it('promotes streaming text without tool_use to finalText (so it renders outside the timeline)', () => {
    const messages = [
      userMessage('go'),
      assistantMessage([{ type: 'text', text: 'still typing' }]),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: true,
      toolResultsByToolId: {},
    });
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.finalText).toHaveLength(1);
    expect(run.finalText[0].text).toBe('still typing');
  });

  it('routes text out of the timeline even when the same message has a tool_use', () => {
    const messages = [
      userMessage('go'),
      assistantMessage([
        { type: 'text', text: 'Let me search...' },
        { type: 'tool_use', id: 't1', name: 'web_search' },
      ]),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: true,
      toolResultsByToolId: {},
    });
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.finalText).toHaveLength(1);
    expect(run.finalText[0].text).toBe('Let me search...');
    expect(run.steps).toHaveLength(1);
    expect(run.steps[0].kind).toBe('tool');
  });

  it('extracts rich-tool calls into richCards', () => {
    const messages = [
      userMessage('chart it'),
      assistantMessage([
        { type: 'tool_use', id: 't1', name: 'bar_chart' },
        { type: 'tool_use', id: 't2', name: 'web_search' },
      ]),
      toolResultMessage('t1', '{}'),
      toolResultMessage('t2', 'results'),
      assistantMessage([{ type: 'text', text: 'here you go' }]),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: false,
      toolResultsByToolId: { t1: '{}', t2: 'results' },
    });
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.steps).toHaveLength(2);
    expect(run.richCards).toHaveLength(1);
    expect(run.richCards[0].toolUse.name).toBe('bar_chart');
  });

  it('keeps run separate when followed by another user message', () => {
    const messages = [
      userMessage('first'),
      assistantMessage([{ type: 'text', text: 'reply 1' }]),
      userMessage('second'),
      assistantMessage([{ type: 'text', text: 'reply 2' }]),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: false,
      toolResultsByToolId: {},
    });
    expect(units.map((u) => u.kind)).toEqual([
      'user',
      'agent-run',
      'user',
      'agent-run',
    ]);
  });

  it('marks only the last agent-run as streaming when isStreaming is true', () => {
    const messages = [
      userMessage('first'),
      assistantMessage([{ type: 'text', text: 'reply 1' }]),
      userMessage('second'),
      assistantMessage([{ type: 'tool_use', id: 't1', name: 'web_search' }]),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: true,
      toolResultsByToolId: {},
    });
    const firstRun = units[1];
    const secondRun = units[3];
    if (firstRun.kind !== 'agent-run' || secondRun.kind !== 'agent-run') {
      throw new Error('expected agent-runs');
    }
    expect(firstRun.isStreaming).toBe(false);
    expect(secondRun.isStreaming).toBe(true);
  });

  it('merges consecutive thinking blocks within one assistant message', () => {
    const messages = [
      userMessage('go'),
      assistantMessage([
        { type: 'thinking', thinking: 'first part' },
        { type: 'thinking', thinking: 'second part' },
        { type: 'tool_use', id: 't1', name: 'web_search' },
      ]),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: false,
      toolResultsByToolId: {},
    });
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.steps).toHaveLength(2);
    expect(run.steps[0].kind).toBe('thinking');
    if (run.steps[0].kind !== 'thinking') return;
    expect(run.steps[0].transcript).toContain('first part');
    expect(run.steps[0].transcript).toContain('second part');
  });

  it('does not synthesize a pending agent-run when streaming has started but no assistant message arrived', () => {
    const messages = [userMessage('go')];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: true,
      toolResultsByToolId: {},
    });
    expect(units).toHaveLength(1);
    expect(units[0].kind).toBe('user');
  });

  it('does not emit a pending run when not streaming', () => {
    const messages = [userMessage('go')];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: false,
      toolResultsByToolId: {},
    });
    expect(units).toHaveLength(1);
    expect(units[0].kind).toBe('user');
  });

  it('folds skill instructions from a user message into the next agent run', () => {
    const messages = [
      {
        id: nextId(),
        role: 'user',
        content: [
          { type: 'text', text: 'You are a poet.', isSkillInstruction: true },
          { type: 'text', text: 'Write a haiku' },
        ],
        createdAt: new Date().toISOString(),
      } as unknown as Message,
      assistantMessage([{ type: 'text', text: 'Cherry blossoms fall' }]),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: false,
      toolResultsByToolId: {},
    });
    expect(units).toHaveLength(2);
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.steps).toHaveLength(1);
    expect(run.steps[0].kind).toBe('skill_instruction');
    if (run.steps[0].kind !== 'skill_instruction') return;
    expect(run.steps[0].text).toBe('You are a poet.');
    expect(run.finalText[0].text).toBe('Cherry blossoms fall');
  });

  it('handles assistant message with empty content (mid-stream)', () => {
    const messages = [
      userMessage('go'),
      {
        id: nextId(),
        role: 'assistant',
        content: [],
        createdAt: new Date().toISOString(),
      } as unknown as Message,
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: true,
      toolResultsByToolId: {},
    });
    expect(units).toHaveLength(2);
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.steps).toHaveLength(0);
    expect(run.finalText).toHaveLength(0);
    expect(run.isStreaming).toBe(true);
  });
});
