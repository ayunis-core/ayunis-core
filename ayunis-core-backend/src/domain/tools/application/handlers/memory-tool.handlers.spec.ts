import { randomUUID } from 'crypto';
import type { ToolExecutionContext } from 'src/domain/tools/application/ports/execution.handler';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { GetMemoryTool } from 'src/domain/tools/domain/tools/get-memory-tool.entity';
import { SetMemoryTool } from 'src/domain/tools/domain/tools/set-memory-tool.entity';
import { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';
import { InvalidMemoryKeyError } from 'src/domain/memory/application/memory.errors';
import type { FindUserMemoryUseCase } from 'src/domain/memory/application/use-cases/find-user-memory/find-user-memory.use-case';
import type { GetMemoryEntryUseCase } from 'src/domain/memory/application/use-cases/get-memory-entry/get-memory-entry.use-case';
import type { UpsertMemoryEntryUseCase } from 'src/domain/memory/application/use-cases/upsert-memory-entry/upsert-memory-entry.use-case';
import type { DeleteMemoryEntryUseCase } from 'src/domain/memory/application/use-cases/delete-memory-entry/delete-memory-entry.use-case';
import { GetMemoryToolHandler } from './get-memory-tool.handler';
import { SetMemoryToolHandler } from './set-memory-tool.handler';

const userId = randomUUID();
const context: ToolExecutionContext = {
  orgId: randomUUID(),
  threadId: randomUUID(),
};

function entry(key: string, content: string): MemoryEntry {
  return new MemoryEntry({ userId, key, content });
}

describe('GetMemoryToolHandler', () => {
  const tool = new GetMemoryTool();

  function build(
    overrides: {
      getEntry?: jest.Mock;
      findAll?: jest.Mock;
    } = {},
  ) {
    const getMemoryEntryUseCase = {
      execute: overrides.getEntry ?? jest.fn().mockResolvedValue(null),
    } as unknown as GetMemoryEntryUseCase;
    const findUserMemoryUseCase = {
      execute: overrides.findAll ?? jest.fn().mockResolvedValue([]),
    } as unknown as FindUserMemoryUseCase;

    return new GetMemoryToolHandler(
      getMemoryEntryUseCase,
      findUserMemoryUseCase,
    );
  }

  it('returns the full content of an existing key', async () => {
    const handler = build({
      getEntry: jest
        .fn()
        .mockResolvedValue(entry('current_projects', 'Bauvorhaben Nord')),
    });

    const result = await handler.execute({
      tool,
      input: { key: 'current_projects' },
      context,
    });

    expect(result).toBe('Bauvorhaben Nord');
  });

  // A miss has to stay a successful call, or the model apologizes to the user
  // about an internal lookup instead of carrying on.
  it('reports a miss as a normal result listing the keys that do exist', async () => {
    const handler = build({
      findAll: jest
        .fn()
        .mockResolvedValue([entry('personal', 'x'), entry('projects', 'y')]),
    });

    const result = await handler.execute({
      tool,
      input: { key: 'random' },
      context,
    });

    expect(result).toContain('No memory entry "random"');
    expect(result).toContain('personal, projects');
  });

  it('says so when memory is entirely empty', async () => {
    const handler = build();

    const result = await handler.execute({
      tool,
      input: { key: 'random' },
      context,
    });

    expect(result).toContain('Memory is currently empty');
  });

  it('exposes a validation failure to the model so it can correct itself', async () => {
    const handler = build({
      getEntry: jest.fn().mockRejectedValue(new InvalidMemoryKeyError('Bad')),
    });

    await expect(
      handler.execute({ tool, input: { key: 'Bad' }, context }),
    ).rejects.toMatchObject({
      name: 'ToolExecutionFailedError',
      exposeToLLM: true,
    });
  });
});

describe('SetMemoryToolHandler', () => {
  const tool = new SetMemoryTool();

  function build(overrides: { upsert?: jest.Mock; remove?: jest.Mock } = {}) {
    const upsertMemoryEntryUseCase = {
      execute:
        overrides.upsert ??
        jest.fn().mockResolvedValue(entry('personal', 'content')),
    } as unknown as UpsertMemoryEntryUseCase;
    const deleteMemoryEntryUseCase = {
      execute: overrides.remove ?? jest.fn().mockResolvedValue(undefined),
    } as unknown as DeleteMemoryEntryUseCase;

    return {
      handler: new SetMemoryToolHandler(
        upsertMemoryEntryUseCase,
        deleteMemoryEntryUseCase,
      ),
      upsertMemoryEntryUseCase,
      deleteMemoryEntryUseCase,
    };
  }

  it('stores the content under the key', async () => {
    const { handler, upsertMemoryEntryUseCase } = build();

    const result = await handler.execute({
      tool,
      input: { key: 'personal', content: 'Works in the Bauamt' },
      context,
    });

    expect(upsertMemoryEntryUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'personal',
        content: 'Works in the Bauamt',
      }),
    );
    expect(result).toContain('Stored memory "personal"');
  });

  it('removes an open key when the content is empty', async () => {
    const { handler, deleteMemoryEntryUseCase, upsertMemoryEntryUseCase } =
      build();

    const result = await handler.execute({
      tool,
      input: { key: 'current_projects', content: '' },
      context,
    });

    expect(deleteMemoryEntryUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'current_projects' }),
    );
    expect(upsertMemoryEntryUseCase.execute).not.toHaveBeenCalled();
    expect(result).toContain('Removed memory "current_projects"');
  });

  it('clears rather than removes a reserved key', async () => {
    const { handler } = build();

    const result = await handler.execute({
      tool,
      input: { key: 'preferences', content: '   ' },
      context,
    });

    expect(result).toContain('Cleared memory "preferences"');
    expect(result).toContain('stays available');
  });

  it('exposes a rejected write to the model so it can retry', async () => {
    const { handler } = build({
      upsert: jest.fn().mockRejectedValue(new InvalidMemoryKeyError('Nope')),
    });

    await expect(
      handler.execute({
        tool,
        input: { key: 'Nope', content: 'x' },
        context,
      }),
    ).rejects.toBeInstanceOf(ToolExecutionFailedError);
  });
});
