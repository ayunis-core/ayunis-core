import { randomUUID } from 'crypto';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import type { FindPastChatQuery } from 'src/domain/threads/application/use-cases/find-past-chat/find-past-chat.query';
import type { FindPastChatUseCase } from 'src/domain/threads/application/use-cases/find-past-chat/find-past-chat.use-case';
import type { FindPastChatsQuery } from 'src/domain/threads/application/use-cases/find-past-chats/find-past-chats.query';
import type { FindPastChatsUseCase } from 'src/domain/threads/application/use-cases/find-past-chats/find-past-chats.use-case';
import { PastChatScope } from 'src/domain/threads/domain/past-chat-scope';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import type { ToolExecutionContext } from 'src/domain/tools/application/ports/execution.handler';
import { ChatListTool } from 'src/domain/tools/domain/tools/chat-list-tool.entity';
import { ChatReadTool } from 'src/domain/tools/domain/tools/chat-read-tool.entity';
import { ChatListToolHandler } from './chat-list-tool.handler';
import { ChatReadToolHandler } from './chat-read-tool.handler';

const context: ToolExecutionContext = {
  orgId: randomUUID(),
  threadId: randomUUID(),
};
const scope = new PastChatScope(context.threadId, null);
const userId = randomUUID();

const modelError = { name: 'ToolExecutionFailedError', exposeToLLM: true };

describe('ChatListToolHandler', () => {
  const tool = new ChatListTool(scope);

  function build(threads: Thread[] = [], total = threads.length) {
    const execute = jest
      .fn<Promise<Paginated<Thread>>, [FindPastChatsQuery]>()
      .mockResolvedValue(
        new Paginated({ data: threads, limit: 10, offset: 0, total }),
      );
    const handler = new ChatListToolHandler({
      execute,
    } as unknown as FindPastChatsUseCase);
    return { handler, execute };
  }

  it('lists the chats of the page with their dates and the page count', async () => {
    const thread = new Thread({
      userId,
      title: 'Hundesteuer',
      messages: [],
      createdAt: new Date('2026-11-02T08:00:00.000Z'),
      lastActivityAt: new Date('2026-11-03T09:30:00.000Z'),
    });
    const { handler, execute } = build([thread], 21);

    const result = JSON.parse(
      await handler.execute({ tool, input: { page: 3 }, context }),
    ) as unknown;

    expect(result).toEqual({
      page: 3,
      totalPages: 3,
      totalChats: 21,
      chats: [
        {
          threadId: thread.id,
          title: 'Hundesteuer',
          createdAt: '2026-11-02T08:00:00.000Z',
          lastActivityAt: '2026-11-03T09:30:00.000Z',
        },
      ],
    });
    expect(execute.mock.calls[0][0]).toMatchObject({
      scope,
      limit: 10,
      offset: 20,
    });
  });

  it('turns from and to into whole UTC days, the to day included', async () => {
    const { handler, execute } = build();

    await handler.execute({
      tool,
      input: { from: '2026-11-01', to: '2026-11-03' },
      context,
    });

    expect(execute.mock.calls[0][0].activity).toEqual({
      from: new Date('2026-11-01T00:00:00.000Z'),
      before: new Date('2026-11-04T00:00:00.000Z'),
    });
  });

  it.each([
    { from: '2026-11-05', to: '2026-11-01' },
    { from: '2026-02-30' },
    { to: '3.11.2026' },
    { page: 0 },
  ])('tells the model what is wrong with %o', async (input) => {
    const { handler, execute } = build();

    await expect(
      handler.execute({ tool, input, context }),
    ).rejects.toMatchObject(modelError);
    expect(execute).not.toHaveBeenCalled();
  });
});

describe('ChatReadToolHandler', () => {
  const tool = new ChatReadTool(scope);
  const threadId = randomUUID();

  function build(find: () => Promise<Thread>) {
    const execute = jest
      .fn<Promise<Thread>, [FindPastChatQuery]>()
      .mockImplementation(find);
    const handler = new ChatReadToolHandler({
      execute,
    } as unknown as FindPastChatUseCase);
    return { handler, execute };
  }

  function chat(turns: number): Thread {
    const id = threadId;
    return new Thread({
      id,
      userId,
      title: 'Hundesteuer',
      messages: Array.from({ length: turns }, (_, turn) => [
        new UserMessage({
          threadId: id,
          content: [new TextMessageContent(`Frage ${turn + 1}`)],
        }),
        new AssistantMessage({
          threadId: id,
          content: [new TextMessageContent(`Antwort ${turn + 1}`)],
        }),
      ]).flat(),
    });
  }

  it('reads three turns by default and says where to continue', async () => {
    const { handler, execute } = build(() => Promise.resolve(chat(4)));

    const result = JSON.parse(
      await handler.execute({ tool, input: { threadId }, context }),
    ) as { messages: { number: number }[] };

    expect(result).toMatchObject({
      threadId,
      title: 'Hundesteuer',
      totalMessages: 8,
      nextMessageNumber: 7,
    });
    expect(result.messages.map((message) => message.number)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(execute.mock.calls[0][0]).toMatchObject({ scope, threadId });
  });

  // The threads module answers an out-of-scope chat (another user's, an
  // anonymous or routine one, the current chat) exactly like a missing one.
  it('answers a chat it may not read with an ordinary "not found" result', async () => {
    const { handler } = build(() =>
      Promise.reject(new ThreadNotFoundError(threadId, userId)),
    );

    await expect(
      handler.execute({ tool, input: { threadId }, context }),
    ).resolves.toBe(`No chat with ID ${threadId} was found.`);
  });

  it.each([{ turns: 0 }, { turns: 11 }, { messageNumber: 0 }])(
    'rejects %o with a message the model can act on',
    async (input) => {
      const { handler, execute } = build(() => Promise.resolve(chat(1)));

      await expect(
        handler.execute({ tool, input: { threadId, ...input }, context }),
      ).rejects.toMatchObject(modelError);
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it('tells the model when it starts past the end of the chat', async () => {
    const { handler } = build(() => Promise.resolve(chat(1)));

    await expect(
      handler.execute({
        tool,
        input: { threadId, messageNumber: 3 },
        context,
      }),
    ).rejects.toMatchObject({
      ...modelError,
      message: expect.stringContaining('which has 2 messages') as string,
    });
  });
});
