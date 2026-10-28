import type {
  Message,
  ToolResultContent,
  ToolUseContent,
} from '@ayunis/inference';
import {
  pairToolResults,
  UNANSWERED_TOOL_CALL_RESULT,
} from './pair-tool-results.helper';

const user = (text: string): Message => ({
  role: 'user',
  content: [{ type: 'text', text }],
});

const call = (id: string, name = 'source_query'): ToolUseContent => ({
  type: 'tool_use',
  id,
  name,
  input: {},
});

const assistantCalling = (...calls: ToolUseContent[]): Message => ({
  role: 'assistant',
  content: [{ type: 'text', text: 'Let me check.' }, ...calls],
});

const result = (toolCallId: string, text = 'found'): ToolResultContent => ({
  type: 'tool_result',
  toolCallId,
  toolName: 'source_query',
  result: text,
});

const results = (...contents: ToolResultContent[]): Message => ({
  role: 'tool_result',
  content: contents,
});

const placeholder = (id: string, name = 'source_query'): ToolResultContent => ({
  type: 'tool_result',
  toolCallId: id,
  toolName: name,
  result: UNANSWERED_TOOL_CALL_RESULT,
});

describe('pairToolResults', () => {
  it('leaves a history whose tool calls are all answered unchanged', () => {
    const messages = [
      user('Find permit B-2026-184.'),
      assistantCalling(call('a'), call('b')),
      results(result('a'), result('b')),
      { role: 'assistant', content: [{ type: 'text', text: 'Done.' }] },
    ] satisfies Message[];

    expect(pairToolResults(messages)).toEqual({
      messages,
      placeholderCount: 0,
      droppedResultCount: 0,
    });
  });

  it('answers a tool call the user moved past with a placeholder', () => {
    const offer = assistantCalling(call('email', 'send_email'));

    const repaired = pairToolResults([
      user('Draft a reply.'),
      offer,
      user('Actually, summarise the thread instead.'),
    ]);

    expect(repaired.messages).toEqual([
      user('Draft a reply.'),
      offer,
      results(placeholder('email', 'send_email')),
      user('Actually, summarise the thread instead.'),
    ]);
    expect(repaired.placeholderCount).toBe(1);
  });

  it('adds placeholders only for the unanswered calls, in call order', () => {
    const offer = assistantCalling(call('a'), call('b'), call('c'));

    const repaired = pairToolResults([
      user('Search all three.'),
      offer,
      results(result('c', 'third')),
      user('And now?'),
    ]);

    expect(repaired.messages[2]).toEqual(
      results(placeholder('a'), placeholder('b'), result('c', 'third')),
    );
  });

  it('merges consecutive result messages that answer one assistant turn', () => {
    const offer = assistantCalling(call('search'), call('email', 'send_email'));

    const repaired = pairToolResults([
      user('Search, then draft.'),
      offer,
      results(result('search')),
      results({ ...result('email'), toolName: 'send_email', result: 'sent' }),
    ]);

    expect(repaired.messages).toEqual([
      user('Search, then draft.'),
      offer,
      results(result('search'), {
        ...result('email'),
        toolName: 'send_email',
        result: 'sent',
      }),
    ]);
  });

  it('moves a result persisted after a later message back to its call', () => {
    const offer = assistantCalling(call('x'));

    const repaired = pairToolResults([
      user('Summarise the attached permit.'),
      offer,
      user('Who owns it?'),
      results(result('x', 'late result')),
    ]);

    expect(repaired.messages).toEqual([
      user('Summarise the attached permit.'),
      offer,
      results(result('x', 'late result')),
      user('Who owns it?'),
    ]);
    expect(repaired).toMatchObject({
      placeholderCount: 0,
      droppedResultCount: 0,
    });
  });

  it('keeps the first result when a call was answered twice', () => {
    const offer = assistantCalling(call('a'));

    const repaired = pairToolResults([
      user('Search.'),
      offer,
      results(result('a', 'first')),
      user('Again?'),
      results(result('a', 'second')),
    ]);

    expect(repaired.messages).toEqual([
      user('Search.'),
      offer,
      results(result('a', 'first')),
      user('Again?'),
    ]);
    expect(repaired.droppedResultCount).toBe(1);
  });

  it('drops a result that answers no call in the history', () => {
    const offer = assistantCalling(call('a'));

    const repaired = pairToolResults([
      user('Search.'),
      offer,
      results(result('a'), result('stale')),
    ]);

    expect(repaired.messages[2]).toEqual(results(result('a')));
    expect(repaired.droppedResultCount).toBe(1);
  });
});
