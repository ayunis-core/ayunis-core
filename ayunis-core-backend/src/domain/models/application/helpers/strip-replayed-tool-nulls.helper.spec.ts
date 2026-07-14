import { randomUUID } from 'crypto';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { ToolSchema } from '../../domain/value-objects/tool-schema';
import { stripReplayedToolNulls } from './strip-replayed-tool-nulls.helper';

const threadId = randomUUID();

const searchTool: ToolSchema = {
  name: 'search_customers',
  description: 'Search customers',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      churnDate: { type: 'string', format: 'date' },
      note: { type: ['string', 'null'] },
    },
  },
};

function assistantMessageWithToolCall(
  toolName: string,
  params: Record<string, unknown>,
): AssistantMessage {
  return new AssistantMessage({
    threadId,
    content: [new ToolUseMessageContent('call-1', toolName, params)],
  });
}

describe('stripReplayedToolNulls', () => {
  it('strips schema-disallowed nulls from replayed tool-use params', () => {
    const message = assistantMessageWithToolCall('search_customers', {
      name: 'Stadt Ladenburg',
      churnDate: null,
    });

    const [result] = stripReplayedToolNulls([message], [searchTool]);

    expect(
      ((result as AssistantMessage).content[0] as ToolUseMessageContent).params,
    ).toEqual({ name: 'Stadt Ladenburg' });
  });

  it('keeps nulls the schema allows', () => {
    const message = assistantMessageWithToolCall('search_customers', {
      name: 'x',
      note: null,
    });

    const [result] = stripReplayedToolNulls([message], [searchTool]);

    expect((result as AssistantMessage).content[0]).toMatchObject({
      params: { name: 'x', note: null },
    });
  });

  it('does not mutate the persisted message', () => {
    const message = assistantMessageWithToolCall('search_customers', {
      churnDate: null,
    });

    stripReplayedToolNulls([message], [searchTool]);

    expect(message.content[0]).toMatchObject({ params: { churnDate: null } });
  });

  it('preserves message identity, id, and tool-call metadata on stripped copies', () => {
    const content = new ToolUseMessageContent(
      'call-7',
      'search_customers',
      { churnDate: null },
      { gemini: { thoughtSignature: 'sig-1' } },
      { id: 'int-1', name: 'CRM', logoUrl: null },
    );
    const message = new AssistantMessage({ threadId, content: [content] });

    const [result] = stripReplayedToolNulls([message], [searchTool]);

    expect(result.id).toBe(message.id);
    expect(result.createdAt).toBe(message.createdAt);
    expect((result as AssistantMessage).content[0]).toMatchObject({
      id: 'call-7',
      name: 'search_customers',
      providerMetadata: { gemini: { thoughtSignature: 'sig-1' } },
      integration: { id: 'int-1', name: 'CRM', logoUrl: null },
    });
  });

  it('returns the same message instance when nothing was stripped', () => {
    const message = assistantMessageWithToolCall('search_customers', {
      name: 'x',
    });

    const [result] = stripReplayedToolNulls([message], [searchTool]);

    expect(result).toBe(message);
  });

  it('leaves tool calls without a matching tool schema untouched', () => {
    const message = assistantMessageWithToolCall('unknown_tool', {
      field: null,
    });

    const [result] = stripReplayedToolNulls([message], [searchTool]);

    expect(result).toBe(message);
  });

  it('leaves non-assistant messages untouched', () => {
    const message = new UserMessage({
      threadId,
      content: [new TextMessageContent('hello')],
    });

    const [result] = stripReplayedToolNulls([message], [searchTool]);

    expect(result).toBe(message);
  });

  it('returns the same array when no tools are provided', () => {
    const messages = [
      assistantMessageWithToolCall('search_customers', { churnDate: null }),
    ];

    expect(stripReplayedToolNulls(messages, [])).toBe(messages);
  });
});
