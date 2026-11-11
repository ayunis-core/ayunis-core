import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Message, Thread } from '@/pages/chat/model/openapi';
import { createRunFunnelTracker } from './run-funnel-tracking';

const client = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/shared/lib/openpanel', () => ({ openPanel: client }));

let nextRunId = 0;

function userMessage(): Message {
  nextRunId += 1;
  return {
    id: `user-${nextRunId}`,
    threadId: 'thread',
    createdAt: '2026-11-11T08:00:00Z',
    role: 'user',
    content: [{ type: 'text', text: 'Frage' }],
  };
}

function toolCall(id: string, name: string): Message {
  return {
    id: `assistant-${id}`,
    threadId: 'thread',
    createdAt: '2026-11-11T08:00:01Z',
    role: 'assistant',
    content: [{ type: 'tool_use', id, name, params: {} }],
  };
}

function toolResult(id: string, name: string, result: string): Message {
  return {
    id: `tool-${id}`,
    threadId: 'thread',
    createdAt: '2026-11-11T08:00:02Z',
    role: 'tool',
    content: [{ type: 'tool_result', toolId: id, toolName: name, result }],
  };
}

function threadWith(messages: Message[]): Thread {
  return {
    workspaceId: null,
    isAnonymous: false,
    mode: 'auto',
    knowledgeBases: [],
    sources: [],
    mcpIntegrations: [],
    messages,
  } as unknown as Thread;
}

function streamRun(messages: Message[], thread = threadWith([])) {
  const tracker = createRunFunnelTracker({
    isAttach: false,
    voiceInput: false,
    getThread: () => thread,
  });
  messages.forEach((message) => tracker.observeMessage(message));
  tracker.observeRunEnd();
  tracker.trackDelivered();
}

function trackedEvent(name: string): Record<string, unknown> | undefined {
  const call = client.track.mock.calls.find(([event]) => event === name) as
    [string, Record<string, unknown>] | undefined;
  return call?.[1];
}

describe(createRunFunnelTracker.name, () => {
  afterEach(() => {
    client.track.mockReset();
  });

  it('reports a knowledge base the run queried', () => {
    streamRun([
      userMessage(),
      toolCall('kb', 'knowledge_query'),
      toolResult('kb', 'knowledge_query', 'Satzung § 3'),
    ]);

    expect(trackedEvent('ai_output_delivered')).toMatchObject({
      used_knowledge_base: true,
      used_source: false,
      used_internet_search: false,
      used_skill: false,
      used_integration: false,
      created_artifact: false,
    });
  });

  it('reports every used flag false for a run without tools', () => {
    streamRun([userMessage()]);

    expect(trackedEvent('ai_output_delivered')).toMatchObject({
      used_knowledge_base: false,
      used_source: false,
      used_internet_search: false,
      used_skill: false,
      used_integration: false,
      created_artifact: false,
    });
  });

  it('reports MCP tools as integrations and created documents, charts and images as artifacts', () => {
    streamRun([
      userMessage(),
      toolCall('mcp', 'mcp__tool__list_files__1a2b3c4d'),
      toolResult('mcp', 'mcp__tool__list_files__1a2b3c4d', '[]'),
      toolCall('chart', 'bar_chart'),
      toolResult('chart', 'bar_chart', 'Displayed'),
    ]);

    expect(trackedEvent('ai_output_delivered')).toMatchObject({
      used_integration: true,
      created_artifact: true,
    });
  });

  it('does not count tool calls that ended in an error', () => {
    streamRun([
      userMessage(),
      toolCall('search', 'internet_search'),
      toolResult(
        'search',
        'internet_search',
        "The tool didn't provide any result due to an unknown error",
      ),
      toolCall('skill', 'activate_skill'),
      toolResult(
        'skill',
        'activate_skill',
        'A tool with the name activate_skill was not found. It might have been removed or renamed.',
      ),
      toolCall('source', 'source_query'),
    ]);

    expect(trackedEvent('ai_output_delivered')).toMatchObject({
      used_internet_search: false,
      used_skill: false,
      used_source: false,
    });
  });

  it('reports the first message of a thread as its first turn even when the thread already saved it', () => {
    const message = userMessage();

    streamRun([message], threadWith([message]));

    expect(trackedEvent('run_started')).toMatchObject({ thread_turn: 'first' });
    expect(trackedEvent('ai_output_delivered')).toMatchObject({
      thread_turn: 'first',
    });
  });

  it('reports a message after earlier ones as a follow-up', () => {
    const earlier = userMessage();

    streamRun([userMessage()], threadWith([earlier]));

    expect(trackedEvent('run_started')).toMatchObject({
      thread_turn: 'follow_up',
    });
  });

  it('does not report a run whose stream closed before the run ended', () => {
    const tracker = createRunFunnelTracker({
      isAttach: false,
      voiceInput: false,
      getThread: () => threadWith([]),
    });
    tracker.observeMessage(userMessage());

    tracker.trackDelivered();

    expect(trackedEvent('ai_output_delivered')).toBeUndefined();
  });
});
