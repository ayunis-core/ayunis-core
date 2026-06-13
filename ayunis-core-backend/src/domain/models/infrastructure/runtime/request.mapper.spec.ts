import { randomUUID } from 'node:crypto';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import type { ToolSchema } from '../../domain/value-objects/tool-schema';
import { toProviderRequest } from './request.mapper';

const imageContentService = {
  convertImageToBase64: jest.fn(),
} as unknown as ImageContentService;

function userText(text: string): UserMessage {
  return new UserMessage({
    threadId: randomUUID(),
    content: [new TextMessageContent(text)],
  });
}

const tool: ToolSchema = {
  name: 'get_weather',
  description: 'Get the weather',
  parameters: { type: 'object', properties: {} },
};

describe('toProviderRequest', () => {
  it('uses the system prompt as instructions and maps tools', async () => {
    const request = await toProviderRequest(
      {
        messages: [userText('hi')],
        systemPrompt: 'be helpful',
        tools: [tool],
        orgId: 'org-1',
      },
      imageContentService,
    );
    expect(request.instructions).toBe('be helpful');
    expect(request.tools).toEqual([
      {
        name: 'get_weather',
        description: 'Get the weather',
        parameters: { type: 'object', properties: {} },
      },
    ]);
    expect(request.messages).toHaveLength(1);
  });

  it('defaults instructions to an empty string when no system prompt', async () => {
    const request = await toProviderRequest(
      { messages: [userText('hi')], tools: [], orgId: 'org-1' },
      imageContentService,
    );
    expect(request.instructions).toBe('');
  });

  it('omits toolChoice when not provided', async () => {
    const request = await toProviderRequest(
      { messages: [userText('hi')], tools: [tool], orgId: 'org-1' },
      imageContentService,
    );
    expect(request.toolChoice).toBeUndefined();
  });

  it('maps AUTO and REQUIRED tool choices', async () => {
    const auto = await toProviderRequest(
      {
        messages: [userText('hi')],
        tools: [tool],
        toolChoice: ModelToolChoice.AUTO,
        orgId: 'org-1',
      },
      imageContentService,
    );
    expect(auto.toolChoice).toBe('auto');

    const required = await toProviderRequest(
      {
        messages: [userText('hi')],
        tools: [tool],
        toolChoice: ModelToolChoice.REQUIRED,
        orgId: 'org-1',
      },
      imageContentService,
    );
    expect(required.toolChoice).toBe('required');
  });

  it('maps a non-enum string to a named-tool choice', async () => {
    const request = await toProviderRequest(
      {
        messages: [userText('hi')],
        tools: [tool],
        toolChoice: 'get_weather' as ModelToolChoice,
        orgId: 'org-1',
      },
      imageContentService,
    );
    expect(request.toolChoice).toEqual({ tool: 'get_weather' });
  });
});
