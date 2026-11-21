import { randomUUID } from 'crypto';
import type { AddLoadedCapabilitiesToThreadUseCase } from 'src/domain/threads/application/use-cases/add-loaded-capabilities-to-thread/add-loaded-capabilities-to-thread.use-case';
import { AddLoadedCapabilitiesToThreadCommand } from 'src/domain/threads/application/use-cases/add-loaded-capabilities-to-thread/add-loaded-capabilities-to-thread.command';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import {
  LoadableToolGroups,
  LoadToolsTool,
} from 'src/domain/tools/domain/tools/load-tools-tool.entity';
import { LoadToolsToolHandler } from './load-tools-tool.handler';

describe('LoadToolsToolHandler', () => {
  const threadId = randomUUID();
  const orgId = randomUUID();
  const tool = new LoadToolsTool(
    new LoadableToolGroups([
      {
        id: 'routine_management',
        toolNames: ['create_routine', 'edit_routine'],
      },
      {
        id: 'chat_history',
        toolNames: ['chat_list', 'chat_grep', 'chat_read'],
      },
    ]),
  );

  function setup() {
    const execute = jest.fn().mockResolvedValue(undefined);
    const handler = new LoadToolsToolHandler({
      execute,
    } as unknown as AddLoadedCapabilitiesToThreadUseCase);
    const run = (input: Record<string, unknown>) =>
      handler.execute({ tool, input, context: { orgId, threadId } });
    return { execute, run };
  }

  it('stores every requested group on the thread before naming the tools now available', async () => {
    const { execute, run } = setup();

    const result = await run({
      groups: ['chat_history', 'routine_management', 'chat_history'],
    });

    expect(execute).toHaveBeenCalledWith(
      new AddLoadedCapabilitiesToThreadCommand(threadId, [
        'routine_management',
        'chat_history',
      ]),
    );
    expect(result).toContain(
      'routine_management (create_routine, edit_routine)',
    );
    expect(result).toContain('chat_history (chat_list, chat_grep, chat_read)');
  });

  it.each([
    ['an unknown group', ['routines']],
    [
      'a loaded or unavailable group next to a valid one',
      ['routine_management', 'artifacts'],
    ],
  ])(
    'rejects %s with the valid groups and stores nothing',
    async (_label, groups) => {
      const { execute, run } = setup();

      const error = await run({ groups }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ToolExecutionFailedError);
      expect((error as ToolExecutionFailedError).exposeToLLM).toBe(true);
      expect((error as Error).message).toContain(
        'Valid groups: routine_management, chat_history.',
      );
      expect(execute).not.toHaveBeenCalled();
    },
  );
});
