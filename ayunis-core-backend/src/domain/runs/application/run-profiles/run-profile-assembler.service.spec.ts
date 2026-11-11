import type { Hook } from '@ayunis/agent-runtime';
import type { UUID } from 'crypto';
import type { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';
import { McpTool } from 'src/domain/mcp/domain/mcp-tool.entity';
import { McpToolAllowance } from 'src/domain/mcp/domain/mcp-tool-allowance.entity';
import type { FindMcpToolAllowancesUseCase } from 'src/domain/mcp/application/use-cases/find-mcp-tool-allowances/find-mcp-tool-allowances.use-case';
import type { BackendToolAdapter } from 'src/domain/runs/application/agent-runtime/backend-tool.adapter';
import { RuntimeToolIntegrationRegistry } from 'src/domain/runs/application/agent-runtime/runtime-tool-integration.registry';
import {
  PromptSlot,
  type CapabilityAssemblyState,
  type RunCapability,
  type RunProfileHandle,
} from 'src/domain/runs/application/run-capabilities/run-capability';
import type { RunCapabilityContextFactory } from 'src/domain/runs/application/run-capabilities/run-capability-context.factory';
import type { RunCapabilityInput } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  aCapabilityContext,
  aThread,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/runs/testing/run-capability.fixture';
import { DONE_WHEN_MODEL_STOPS, type RunProfile } from './run-profile';
import { RunProfileAssembler } from './run-profile-assembler.service';

const tool = (name: string) => ({ name }) as Tool;

const RATHAUS_ID: UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ARCHIV_ID: UUID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const mcpTool = (name: string, integrationId: UUID) =>
  new McpIntegrationTool(
    new McpTool(name, undefined, { type: 'object' }, integrationId),
    false,
    'Rathaus',
    null,
  );

function buildAssembler(
  capabilities: RunCapability[],
  options: {
    asksForToolConfirmation?: boolean;
    allowances?: McpToolAllowance[];
  } = {},
) {
  const thread = aThread();
  const refreshedThread = aThread({ id: thread.id });
  const createContext = jest.fn((input: RunCapabilityInput) =>
    Promise.resolve(aCapabilityContext({ thread: input.thread })),
  );
  const findThread = jest.fn().mockResolvedValue({ thread: refreshedThread });
  const toRuntimeTools = jest.fn((tools: Tool[]) =>
    tools.map((t) => ({ name: `runtime:${t.name}` })),
  );
  const findAllowances = jest.fn().mockResolvedValue(options.allowances ?? []);
  const assembler = new RunProfileAssembler(
    { create: createContext } as unknown as RunCapabilityContextFactory,
    { execute: findThread } as unknown as FindThreadUseCase,
    { toRuntimeTools } as unknown as BackendToolAdapter,
    { execute: findAllowances } as unknown as FindMcpToolAllowancesUseCase,
  );
  const profile: RunProfile = {
    id: 'chat',
    preamble: 'You are the Ayunis assistant.',
    closing: 'You are now ready to assist the user.',
    capabilities,
    completionPolicy: DONE_WHEN_MODEL_STOPS,
    maxIterations: 50,
    asksForToolConfirmation: options.asksForToolConfirmation ?? true,
  };
  const input: RunCapabilityInput = {
    profile: { id: 'chat' },
    thread,
    model: aCapabilityContext().model,
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
    isAnonymous: false,
  };
  return {
    assemble: () => assembler.assemble(profile, input),
    thread,
    refreshedThread,
    createContext,
    findThread,
    findAllowances,
    toRuntimeTools,
  };
}

describe('RunProfileAssembler', () => {
  it('merges tools and instructions in capability order', async () => {
    const { assemble } = buildAssembler([
      {
        contribute: () => ({
          tools: [tool('code_execution')],
          sections: [
            { slot: PromptSlot.POLICIES, content: '<data_handling/>' },
          ],
        }),
      },
      {
        contribute: () => ({
          tools: [tool('internet_search')],
          sections: [{ slot: PromptSlot.FRAMING, content: '<context/>' }],
        }),
      },
    ]);

    const assembled = await assemble();

    expect(assembled.tools.map((t) => t.name)).toEqual([
      'code_execution',
      'internet_search',
    ]);
    expect(assembled.instructions).toBe(
      [
        'You are the Ayunis assistant.',
        '<context/>',
        '<data_handling/>',
        'You are now ready to assist the user.',
      ].join('\n\n'),
    );
  });

  it('tells each capability which tool names earlier capabilities took', async () => {
    const seen: string[][] = [];
    const record = (state: CapabilityAssemblyState) =>
      seen.push([...state.reservedToolNames]);
    const { assemble } = buildAssembler([
      {
        contribute: (_ctx, state) => {
          record(state);
          return { tools: [tool('code_execution'), tool('map')] };
        },
      },
      {
        contribute: (_ctx, state) => {
          record(state);
          return {};
        },
      },
    ]);

    await assemble();

    expect(seen).toEqual([[], ['code_execution', 'map']]);
  });

  it('builds all capabilities from one shared context', async () => {
    const contexts: unknown[] = [];
    const { assemble, createContext } = buildAssembler([
      { contribute: (ctx) => (contexts.push(ctx), {}) },
      { contribute: (ctx) => (contexts.push(ctx), {}) },
    ]);

    await assemble();

    expect(createContext).toHaveBeenCalledTimes(1);
    expect(contexts[0]).toBe(contexts[1]);
  });

  it('refreshes tools and instructions from the current thread for profile hooks', async () => {
    let handle: RunProfileHandle | undefined;
    const contribute = jest
      .fn()
      .mockReturnValueOnce({
        tools: [tool('activate_skill')],
        hooks: [
          (run: RunProfileHandle): Hook => {
            handle = run;
            return { name: 'ayunis-skill-activation' };
          },
        ],
      })
      .mockReturnValueOnce({
        tools: [tool('activate_skill'), tool('source_query')],
        sections: [
          { slot: PromptSlot.RESOURCES, content: '<available_files/>' },
        ],
      });
    const { assemble, findThread, createContext, thread, refreshedThread } =
      buildAssembler([{ contribute }]);
    const assembled = await assemble();
    const integrations = new RuntimeToolIntegrationRegistry(assembled.tools);
    const replaceTools = jest.spyOn(integrations, 'replaceTools');
    const target = { setTools: jest.fn(), setInstructions: jest.fn() };

    const hooks = assembled.createHooks(integrations);
    await handle!.refresh(target);

    expect(hooks.map((hook) => hook.name)).toEqual(['ayunis-skill-activation']);
    expect(findThread).toHaveBeenCalledWith(
      expect.objectContaining({ id: thread.id }),
    );
    expect(createContext).toHaveBeenLastCalledWith(
      expect.objectContaining({ thread: refreshedThread }),
    );
    const runtimeTools = [
      { name: 'runtime:activate_skill' },
      { name: 'runtime:source_query' },
    ];
    expect(replaceTools).toHaveBeenCalledWith(
      [tool('activate_skill'), tool('source_query')],
      runtimeTools,
    );
    expect(target.setTools).toHaveBeenCalledWith(runtimeTools);
    expect(target.setInstructions).toHaveBeenCalledWith(
      expect.stringContaining('<available_files/>'),
    );
  });

  describe('tool confirmation', () => {
    const offering = (...tools: Tool[]): RunCapability[] => [
      { contribute: () => ({ tools }) },
    ];
    const allowed = (integrationId: UUID, toolName: string) =>
      new McpToolAllowance({
        userId: TEST_USER_ID,
        integrationId,
        toolName,
      });

    it('asks to confirm every MCP tool the user has not always allowed for that integration', async () => {
      const { assemble, findAllowances } = buildAssembler(
        offering(
          tool('internet_search'),
          mcpTool('create_ticket', RATHAUS_ID),
          mcpTool('search_files', RATHAUS_ID),
          mcpTool('create_ticket', ARCHIV_ID),
        ),
        { allowances: [allowed(RATHAUS_ID, 'create_ticket')] },
      );

      const assembled = await assemble();

      expect([...assembled.toolsNeedingApproval]).toEqual([
        mcpTool('search_files', RATHAUS_ID).name,
        mcpTool('create_ticket', ARCHIV_ID).name,
      ]);
      expect(findAllowances).toHaveBeenCalledWith(
        expect.objectContaining({ integrationIds: [RATHAUS_ID, ARCHIV_ID] }),
      );
    });

    it('asks to confirm no tool in a profile that does not ask for confirmation', async () => {
      const { assemble } = buildAssembler(
        offering(mcpTool('create_ticket', RATHAUS_ID)),
        { asksForToolConfirmation: false },
      );

      const assembled = await assemble();

      expect(assembled.toolsNeedingApproval.size).toBe(0);
    });

    it('asks to confirm the MCP tools a refresh adds', async () => {
      let handle: RunProfileHandle | undefined;
      const added = mcpTool('create_ticket', RATHAUS_ID);
      const contribute = jest
        .fn()
        .mockReturnValueOnce({
          tools: [tool('activate_skill')],
          hooks: [
            (run: RunProfileHandle): Hook => {
              handle = run;
              return { name: 'ayunis-skill-activation' };
            },
          ],
        })
        .mockReturnValueOnce({ tools: [tool('activate_skill'), added] });
      const { assemble, toRuntimeTools } = buildAssembler([{ contribute }]);
      const assembled = await assemble();
      assembled.createHooks(new RuntimeToolIntegrationRegistry([]));

      await handle!.refresh({
        setTools: jest.fn(),
        setInstructions: jest.fn(),
      });

      expect(toRuntimeTools).toHaveBeenLastCalledWith(
        [tool('activate_skill'), added],
        new Set([added.name]),
      );
    });
  });
});
