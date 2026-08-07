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
  stream?: {
    status: 'streaming' | 'invalid';
    argumentsJson: string;
  };
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
        stream: block.stream,
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
  it('preserves text, tool, and later text in chronological render order', () => {
    const messages = [
      userMessage('find it'),
      assistantMessage([
        { type: 'text', text: 'I will search.' },
        { type: 'tool_use', id: 't1', name: 'internet_search' },
      ]),
      toolResultMessage('t1', 'search results'),
      assistantMessage([{ type: 'text', text: 'Here is the answer.' }]),
    ];

    const units = groupMessagesIntoRuns(messages, {
      isStreaming: false,
    });

    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.blocks.map((block) => block.kind)).toEqual([
      'text',
      'activity',
      'text',
    ]);
    const activity = run.blocks[1];
    if (activity.kind !== 'activity') throw new Error('expected activity');
    expect(activity.steps[0]).toMatchObject({
      kind: 'tool',
      result: 'search results',
      status: 'done',
    });
  });

  it('keeps a rich tool inline between surrounding assistant text', () => {
    const messages = [
      userMessage('chart it'),
      assistantMessage([
        { type: 'text', text: 'Building the chart.' },
        { type: 'tool_use', id: 'chart-1', name: 'bar_chart' },
      ]),
      assistantMessage([{ type: 'text', text: 'The chart is ready.' }]),
    ];

    const units = groupMessagesIntoRuns(messages, {
      isStreaming: false,
    });

    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.blocks.map((block) => block.kind)).toEqual([
      'text',
      'rich-tool',
      'text',
    ]);
  });

  it('keeps a stable inline block while a streamed tool name resolves to a rich tool', () => {
    const user = userMessage('chart it');
    const partialToolCall = assistantMessage([
      {
        type: 'tool_use',
        id: 'chart-1',
        name: '',
        stream: { status: 'streaming', argumentsJson: '{"title":' },
      },
    ]);
    const resolvedToolCall = {
      ...partialToolCall,
      content: [
        {
          ...partialToolCall.content[0],
          name: 'bar_chart',
        },
      ],
    } as Message;

    const partialUnits = groupMessagesIntoRuns([user, partialToolCall], {
      isStreaming: true,
    });
    const resolvedUnits = groupMessagesIntoRuns([user, resolvedToolCall], {
      isStreaming: true,
    });

    const partialRun = partialUnits[1];
    const resolvedRun = resolvedUnits[1];
    if (partialRun.kind !== 'agent-run' || resolvedRun.kind !== 'agent-run') {
      throw new Error('expected agent-runs');
    }
    const partialBlock = partialRun.blocks[0];
    const resolvedBlock = resolvedRun.blocks[0];
    expect(partialBlock.kind).toBe('pending-tool');
    expect(resolvedBlock.kind).toBe('rich-tool');
    expect(resolvedBlock.key).toBe(partialBlock.key);
  });

  it('updates a tool result in place without changing its render key', () => {
    const toolCall = assistantMessage([
      { type: 'tool_use', id: 't1', name: 'internet_search' },
    ]);
    const streaming = groupMessagesIntoRuns([userMessage('go'), toolCall], {
      isStreaming: true,
    });
    const completed = groupMessagesIntoRuns(
      [userMessage('go'), toolCall, toolResultMessage('t1', 'done')],
      {
        isStreaming: true,
      },
    );

    const streamingRun = streaming[1];
    const completedRun = completed[1];
    if (
      streamingRun.kind !== 'agent-run' ||
      completedRun.kind !== 'agent-run'
    ) {
      throw new Error('expected agent-runs');
    }
    const streamingBlock = streamingRun.blocks[0];
    const completedBlock = completedRun.blocks[0];
    expect(completedBlock.key).toBe(streamingBlock.key);
    if (
      streamingBlock.kind !== 'activity' ||
      completedBlock.kind !== 'activity'
    ) {
      throw new Error('expected activity blocks');
    }
    expect(streamingBlock.steps[0].status).toBe('in_progress');
    expect(completedBlock.steps[0]).toMatchObject({
      status: 'done',
      result: 'done',
    });
  });

  it('keeps unresolved parallel tools in progress after a sibling result arrives', () => {
    const messages = [
      userMessage('check both'),
      assistantMessage([
        { type: 'tool_use', id: 't1', name: 'internet_search' },
        { type: 'tool_use', id: 't2', name: 'read_document' },
      ]),
      toolResultMessage('t1', 'search results'),
    ];

    const units = groupMessagesIntoRuns(messages, {
      isStreaming: true,
    });

    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    const block = run.blocks[0];
    if (block.kind !== 'activity') throw new Error('expected activity');
    expect(block.steps).toHaveLength(2);
    expect(block.steps[0]).toMatchObject({
      kind: 'tool',
      result: 'search results',
      status: 'done',
    });
    expect(block.steps[1]).toMatchObject({
      kind: 'tool',
      status: 'in_progress',
    });
  });

  it('settles a display-only rich tool when the run stops without a result', () => {
    const messages = [
      userMessage('draft an email'),
      assistantMessage([
        { type: 'tool_use', id: 'email-1', name: 'send_email' },
      ]),
    ];

    const units = groupMessagesIntoRuns(messages, {
      isStreaming: false,
    });

    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    const block = run.blocks[0];
    if (block.kind !== 'rich-tool') throw new Error('expected rich tool');
    expect(block.steps[0].status).toBe('done');
  });

  it('returns empty array for empty input', () => {
    const result = groupMessagesIntoRuns([], {
      isStreaming: false,
    });
    expect(result).toEqual([]);
  });

  it('emits a user unit for each user message', () => {
    const messages = [userMessage('hello'), userMessage('world')];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: false,
    });
    expect(units).toHaveLength(2);
    expect(units[0].kind).toBe('user');
    expect(units[1].kind).toBe('user');
  });

  it('groups an assistant text reply as a single text block', () => {
    const messages = [
      userMessage('hi'),
      assistantMessage([{ type: 'text', text: 'hello!' }]),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: false,
    });
    expect(units).toHaveLength(2);
    expect(units[0].kind).toBe('user');
    const run = units[1];
    expect(run.kind).toBe('agent-run');
    if (run.kind !== 'agent-run') return;
    expect(run.blocks).toHaveLength(1);
    expect(run.blocks[0].kind).toBe('text');
    if (run.blocks[0].kind !== 'text') return;
    expect(run.blocks[0].content.text).toBe('hello!');
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
    });
    expect(units).toHaveLength(2);
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.blocks.map((block) => block.kind)).toEqual(['activity', 'text']);
    const activity = run.blocks[0];
    const text = run.blocks[1];
    if (activity.kind !== 'activity' || text.kind !== 'text') {
      throw new Error('expected activity and text blocks');
    }
    expect(activity.steps).toHaveLength(3); // thinking + 2 tool calls
    expect(activity.steps[0].kind).toBe('thinking');
    expect(activity.steps[1]).toMatchObject({ kind: 'tool', status: 'done' });
    expect(activity.steps[2]).toMatchObject({ kind: 'tool', status: 'done' });
    expect(text.content.text).toBe('done!');
  });

  it('marks tool steps without results as in_progress', () => {
    const messages = [
      userMessage('go'),
      assistantMessage([{ type: 'tool_use', id: 't1', name: 'web_search' }]),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: true,
    });
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    const block = run.blocks[0];
    if (block.kind !== 'activity') throw new Error('expected activity');
    expect(block.steps[0]).toMatchObject({
      kind: 'tool',
      status: 'in_progress',
    });
    expect(run.isStreaming).toBe(true);
  });

  it('marks invalid rich tool calls as ordinary error activity', () => {
    const messages = [
      userMessage('chart it'),
      assistantMessage([
        {
          type: 'tool_use',
          id: 't1',
          name: 'bar_chart',
          stream: {
            status: 'invalid',
            argumentsJson: '{"title":',
          },
        },
      ]),
    ];

    const units = groupMessagesIntoRuns(messages, {
      isStreaming: false,
    });

    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.blocks).toHaveLength(1);
    const block = run.blocks[0];
    if (block.kind !== 'activity') throw new Error('expected activity');
    expect(block.steps[0].status).toBe('error');
  });

  it('emits streaming assistant text as a text block', () => {
    const messages = [
      userMessage('go'),
      assistantMessage([{ type: 'text', text: 'still typing' }]),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: true,
    });
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.blocks[0].kind).toBe('text');
    if (run.blocks[0].kind !== 'text') return;
    expect(run.blocks[0].content.text).toBe('still typing');
  });

  it('keeps text before a tool from the same assistant message', () => {
    const messages = [
      userMessage('go'),
      assistantMessage([
        { type: 'text', text: 'Let me search...' },
        { type: 'tool_use', id: 't1', name: 'web_search' },
      ]),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: true,
    });
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.blocks.map((block) => block.kind)).toEqual(['text', 'activity']);
    const text = run.blocks[0];
    if (text.kind !== 'text') throw new Error('expected text');
    expect(text.content.text).toBe('Let me search...');
  });

  it('keeps a rich tool inline while grouping adjacent ordinary activity', () => {
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
    });
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.blocks.map((block) => block.kind)).toEqual([
      'rich-tool',
      'activity',
      'text',
    ]);
    const richTool = run.blocks[0];
    if (richTool.kind !== 'rich-tool') throw new Error('expected rich tool');
    expect(richTool.steps[0].toolUse.name).toBe('bar_chart');
    expect(richTool.steps[0].result).toBe('{}');
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
    });
    expect(units.map((u) => u.kind)).toEqual([
      'user',
      'agent-run',
      'user',
      'agent-run',
    ]);
  });

  it('does not mark a prior agent-run as streaming while a new user turn is pending', () => {
    const messages = [
      userMessage('first'),
      assistantMessage([{ type: 'text', text: 'reply' }]),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: true,
      hasPendingUserTurn: true,
    });
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.isStreaming).toBe(false);
  });

  it('does not reactivate a completed display tool while a new user turn is pending', () => {
    const messages = [
      userMessage('first'),
      assistantMessage([
        { type: 'tool_use', id: 'email-1', name: 'send_email' },
      ]),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: true,
      hasPendingUserTurn: true,
    });

    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    const block = run.blocks[0];
    if (block.kind !== 'rich-tool') throw new Error('expected rich tool');
    expect(block.steps[0].status).toBe('done');
  });

  it('does not reactivate a prior tool while a streamed user turn awaits its assistant message', () => {
    const messages = [
      userMessage('first'),
      assistantMessage([
        { type: 'tool_use', id: 'email-1', name: 'send_email' },
      ]),
      userMessage('second'),
    ];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: true,
    });

    const priorRun = units[1];
    if (priorRun.kind !== 'agent-run') throw new Error('expected agent-run');
    const block = priorRun.blocks[0];
    if (block.kind !== 'rich-tool') throw new Error('expected rich tool');
    expect(block.steps[0].status).toBe('done');
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
    });
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    const block = run.blocks[0];
    if (block.kind !== 'activity') throw new Error('expected activity');
    expect(block.steps).toHaveLength(2);
    expect(block.steps[0].kind).toBe('thinking');
    if (block.steps[0].kind !== 'thinking') return;
    expect(block.steps[0].transcript).toContain('first part');
    expect(block.steps[0].transcript).toContain('second part');
  });

  it('does not synthesize a pending agent-run when streaming has started but no assistant message arrived', () => {
    const messages = [userMessage('go')];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: true,
    });
    expect(units).toHaveLength(1);
    expect(units[0].kind).toBe('user');
  });

  it('does not emit a pending run when not streaming', () => {
    const messages = [userMessage('go')];
    const units = groupMessagesIntoRuns(messages, {
      isStreaming: false,
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
    });
    expect(units).toHaveLength(2);
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.blocks.map((block) => block.kind)).toEqual(['activity', 'text']);
    const activity = run.blocks[0];
    const text = run.blocks[1];
    if (activity.kind !== 'activity' || text.kind !== 'text') {
      throw new Error('expected activity and text');
    }
    expect(activity.steps[0]).toMatchObject({
      kind: 'skill_instruction',
      text: 'You are a poet.',
    });
    expect(text.content.text).toBe('Cherry blossoms fall');
  });

  describe('same-artifact widget dedup', () => {
    it('merges consecutive edits of the same artifact into one rich-tool block', () => {
      const messages = [
        userMessage('polish the policy'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e1',
            name: 'edit_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('e1', 'edited v2'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e2',
            name: 'edit_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('e2', 'edited v3'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e3',
            name: 'edit_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('e3', 'edited v4'),
        assistantMessage([{ type: 'text', text: 'All polished.' }]),
      ];

      const units = groupMessagesIntoRuns(messages, { isStreaming: false });

      const run = units[1];
      if (run.kind !== 'agent-run') throw new Error('expected agent-run');
      expect(run.blocks.map((block) => block.kind)).toEqual([
        'rich-tool',
        'text',
      ]);
      const richTool = run.blocks[0];
      if (richTool.kind !== 'rich-tool') throw new Error('expected rich tool');
      expect(richTool.steps).toHaveLength(3);
      expect(richTool.steps.map((step) => step.toolUse.id)).toEqual([
        'e1',
        'e2',
        'e3',
      ]);
      expect(richTool.steps.at(-1)).toMatchObject({
        result: 'edited v4',
        status: 'done',
      });
      expect(richTool.key).toBe(richTool.steps[0].key);
    });

    it('keeps separate widgets for edits of different artifacts', () => {
      const messages = [
        userMessage('edit both'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e1',
            name: 'edit_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('e1', 'ok'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e2',
            name: 'edit_document',
            params: { artifact_id: 'art-2' },
          },
        ]),
        toolResultMessage('e2', 'ok'),
      ];

      const units = groupMessagesIntoRuns(messages, { isStreaming: false });

      const run = units[1];
      if (run.kind !== 'agent-run') throw new Error('expected agent-run');
      expect(run.blocks.map((block) => block.kind)).toEqual([
        'rich-tool',
        'rich-tool',
      ]);
    });

    it('keeps the create widget separate from subsequent edits', () => {
      const messages = [
        userMessage('create and refine'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'c1',
            name: 'create_document',
            params: { title: 'AI Policy' },
          },
        ]),
        toolResultMessage('c1', 'Artifact ID: art-1, version: 1'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e1',
            name: 'edit_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('e1', 'ok'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e2',
            name: 'edit_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('e2', 'ok'),
      ];

      const units = groupMessagesIntoRuns(messages, { isStreaming: false });

      const run = units[1];
      if (run.kind !== 'agent-run') throw new Error('expected agent-run');
      expect(run.blocks.map((block) => block.kind)).toEqual([
        'rich-tool',
        'rich-tool',
      ]);
      const createBlock = run.blocks[0];
      const editBlock = run.blocks[1];
      if (createBlock.kind !== 'rich-tool' || editBlock.kind !== 'rich-tool') {
        throw new Error('expected rich tools');
      }
      expect(createBlock.steps).toHaveLength(1);
      expect(editBlock.steps).toHaveLength(2);
    });

    it('merges same-artifact edits across intervening thinking', () => {
      const messages = [
        userMessage('refine'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e1',
            name: 'edit_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('e1', 'ok'),
        assistantMessage([
          { type: 'thinking', thinking: 'what else to fix' },
          {
            type: 'tool_use',
            id: 'e2',
            name: 'edit_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('e2', 'ok'),
      ];

      const units = groupMessagesIntoRuns(messages, { isStreaming: false });

      const run = units[1];
      if (run.kind !== 'agent-run') throw new Error('expected agent-run');
      expect(run.blocks.map((block) => block.kind)).toEqual([
        'rich-tool',
        'activity',
      ]);
      const richTool = run.blocks[0];
      if (richTool.kind !== 'rich-tool') throw new Error('expected rich tool');
      expect(richTool.steps).toHaveLength(2);
    });

    it('merges same-artifact edits across intervening ordinary tool activity', () => {
      const messages = [
        userMessage('refine'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e1',
            name: 'edit_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('e1', 'ok'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'r1',
            name: 'read_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('r1', 'current content'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e2',
            name: 'edit_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('e2', 'ok'),
      ];

      const units = groupMessagesIntoRuns(messages, { isStreaming: false });

      const run = units[1];
      if (run.kind !== 'agent-run') throw new Error('expected agent-run');
      expect(run.blocks.map((block) => block.kind)).toEqual([
        'rich-tool',
        'activity',
      ]);
      const richTool = run.blocks[0];
      if (richTool.kind !== 'rich-tool') throw new Error('expected rich tool');
      expect(richTool.steps).toHaveLength(2);
    });

    it('does not merge edits separated by assistant prose', () => {
      const messages = [
        userMessage('refine'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e1',
            name: 'edit_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('e1', 'ok'),
        assistantMessage([
          { type: 'text', text: 'First pass done, now tightening wording.' },
          {
            type: 'tool_use',
            id: 'e2',
            name: 'edit_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('e2', 'ok'),
      ];

      const units = groupMessagesIntoRuns(messages, { isStreaming: false });

      const run = units[1];
      if (run.kind !== 'agent-run') throw new Error('expected agent-run');
      expect(run.blocks.map((block) => block.kind)).toEqual([
        'rich-tool',
        'text',
        'rich-tool',
      ]);
    });

    it('merges update_document and edit_document calls on the same artifact', () => {
      const messages = [
        userMessage('rework it'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'u1',
            name: 'update_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('u1', 'ok'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e1',
            name: 'edit_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('e1', 'ok'),
      ];

      const units = groupMessagesIntoRuns(messages, { isStreaming: false });

      const run = units[1];
      if (run.kind !== 'agent-run') throw new Error('expected agent-run');
      expect(run.blocks.map((block) => block.kind)).toEqual(['rich-tool']);
      const richTool = run.blocks[0];
      if (richTool.kind !== 'rich-tool') throw new Error('expected rich tool');
      expect(richTool.steps).toHaveLength(2);
    });

    it('merges a follow-up edit into the previous widget while its arguments still stream', () => {
      const messages = [
        userMessage('refine'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e1',
            name: 'edit_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('e1', 'ok'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e2',
            name: 'edit_document',
            params: {},
            stream: {
              status: 'streaming',
              argumentsJson: '{"artifact_id": "art-',
            },
          },
        ]),
      ];

      const units = groupMessagesIntoRuns(messages, { isStreaming: true });

      const run = units[1];
      if (run.kind !== 'agent-run') throw new Error('expected agent-run');
      expect(run.blocks.map((block) => block.kind)).toEqual(['rich-tool']);
      const richTool = run.blocks[0];
      if (richTool.kind !== 'rich-tool') throw new Error('expected rich tool');
      expect(richTool.steps).toHaveLength(2);
      expect(richTool.steps.at(-1)).toMatchObject({ status: 'in_progress' });
    });

    it('does not merge a streaming edit into a widget of another artifact family', () => {
      const messages = [
        userMessage('refine'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'd1',
            name: 'update_diagram',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('d1', 'ok'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e1',
            name: 'edit_document',
            params: {},
            stream: {
              status: 'streaming',
              argumentsJson: '{"artifact_id": "art-',
            },
          },
        ]),
      ];

      const units = groupMessagesIntoRuns(messages, { isStreaming: true });

      const run = units[1];
      if (run.kind !== 'agent-run') throw new Error('expected agent-run');
      expect(run.blocks.map((block) => block.kind)).toEqual([
        'rich-tool',
        'rich-tool',
      ]);
    });

    it('does not merge a completed edit whose params lack an artifact id', () => {
      const messages = [
        userMessage('refine'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e1',
            name: 'edit_document',
            params: { artifact_id: 'art-1' },
          },
        ]),
        toolResultMessage('e1', 'ok'),
        assistantMessage([
          {
            type: 'tool_use',
            id: 'e2',
            name: 'edit_document',
            params: {},
          },
        ]),
        toolResultMessage('e2', 'ok'),
      ];

      const units = groupMessagesIntoRuns(messages, { isStreaming: false });

      const run = units[1];
      if (run.kind !== 'agent-run') throw new Error('expected agent-run');
      expect(run.blocks.map((block) => block.kind)).toEqual([
        'rich-tool',
        'rich-tool',
      ]);
    });

    it('keeps the merged block key stable while the latest edit streams in', () => {
      const first = assistantMessage([
        {
          type: 'tool_use',
          id: 'e1',
          name: 'edit_document',
          params: { artifact_id: 'art-1' },
        },
      ]);
      const second = assistantMessage([
        {
          type: 'tool_use',
          id: 'e2',
          name: 'edit_document',
          params: { artifact_id: 'art-1' },
        },
      ]);
      const user = userMessage('refine');
      const result1 = toolResultMessage('e1', 'ok');

      const before = groupMessagesIntoRuns([user, first, result1], {
        isStreaming: true,
      });
      const after = groupMessagesIntoRuns([user, first, result1, second], {
        isStreaming: true,
      });

      const beforeRun = before[1];
      const afterRun = after[1];
      if (beforeRun.kind !== 'agent-run' || afterRun.kind !== 'agent-run') {
        throw new Error('expected agent-runs');
      }
      expect(afterRun.blocks).toHaveLength(1);
      expect(afterRun.blocks[0].key).toBe(beforeRun.blocks[0].key);
      const merged = afterRun.blocks[0];
      if (merged.kind !== 'rich-tool') throw new Error('expected rich tool');
      expect(merged.steps.at(-1)).toMatchObject({
        status: 'in_progress',
      });
    });
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
    });
    expect(units).toHaveLength(2);
    const run = units[1];
    if (run.kind !== 'agent-run') throw new Error('expected agent-run');
    expect(run.blocks).toHaveLength(0);
    expect(run.isStreaming).toBe(true);
  });
});
