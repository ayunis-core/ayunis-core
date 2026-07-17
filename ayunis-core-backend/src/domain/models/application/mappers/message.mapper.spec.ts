import { randomUUID } from 'node:crypto';
import type {
  ImageContent,
  TextContent,
  ToolUseContent,
} from '@ayunis/inference';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { toInferenceMessages } from './message.mapper';

const convertImageToBase64 = jest.fn();
const imageContentService = {
  convertImageToBase64,
} as unknown as ImageContentService;

beforeEach(() => convertImageToBase64.mockReset());

describe('toInferenceMessages', () => {
  it('maps a user text message to a neutral user message', async () => {
    const messages = await toInferenceMessages(
      [
        new UserMessage({
          threadId: randomUUID(),
          content: [new TextMessageContent('hello')],
        }),
      ],
      'org-1',
      imageContentService,
    );
    expect(messages[0].role).toBe('user');
    expect(messages[0].content[0]).toEqual({ type: 'text', text: 'hello' });
  });

  it('resolves image content to inline base64 data', async () => {
    convertImageToBase64.mockResolvedValue({
      base64: 'AAAA',
      contentType: 'image/png',
    });
    const messages = await toInferenceMessages(
      [
        new UserMessage({
          threadId: randomUUID(),
          content: [new ImageMessageContent(0, 'image/png')],
        }),
      ],
      'org-1',
      imageContentService,
    );
    expect(convertImageToBase64).toHaveBeenCalledTimes(1);
    expect(messages[0].content[0]).toEqual<ImageContent>({
      type: 'image',
      data: 'AAAA',
      mediaType: 'image/png',
    });
  });

  it('maps an assistant message with thinking, text and tool use', async () => {
    const messages = await toInferenceMessages(
      [
        new AssistantMessage({
          threadId: randomUUID(),
          content: [
            new ThinkingMessageContent('reasoning', 'r1', 'sig'),
            new TextMessageContent('the answer'),
            new ToolUseMessageContent('c1', 'get_weather', { city: 'berlin' }),
          ],
        }),
      ],
      'org-1',
      imageContentService,
    );
    expect(messages[0].role).toBe('assistant');
    expect(messages[0].content[0]).toMatchObject({
      type: 'thinking',
      thinking: 'reasoning',
      id: 'r1',
      signature: 'sig',
    });
    expect(messages[0].content[1]).toMatchObject<Partial<TextContent>>({
      type: 'text',
      text: 'the answer',
    });
    expect(messages[0].content[2]).toMatchObject<Partial<ToolUseContent>>({
      type: 'tool_use',
      id: 'c1',
      name: 'get_weather',
      input: { city: 'berlin' },
    });
  });

  it('maps a tool result message to the tool_result role', async () => {
    const messages = await toInferenceMessages(
      [
        new ToolResultMessage({
          threadId: randomUUID(),
          content: [new ToolResultMessageContent('c1', 'get_weather', 'sunny')],
        }),
      ],
      'org-1',
      imageContentService,
    );
    expect(messages[0].role).toBe('tool_result');
    expect(messages[0].content[0]).toEqual({
      type: 'tool_result',
      toolCallId: 'c1',
      toolName: 'get_weather',
      result: 'sunny',
    });
  });

  it('maps a system message to a system text message', async () => {
    const messages = await toInferenceMessages(
      [
        new SystemMessage({
          threadId: randomUUID(),
          content: [new TextMessageContent('system note')],
        }),
      ],
      'org-1',
      imageContentService,
    );
    expect(messages[0].role).toBe('system');
    expect(messages[0].content[0]).toEqual({
      type: 'text',
      text: 'system note',
    });
  });
});
