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
import {
  DONE_WHEN_MODEL_STOPS,
  eager,
  onDemand,
  type ProfileCapability,
  type RunProfile,
} from './run-profile';
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

type TestCapability = Pick<RunCapability, 'contribute'> &
  Partial<RunCapability>;

const capability = (definition: TestCapability): RunCapability => ({
  id: 'test_capability',
  description: 'Used by the test.',
  ...definition,
});

const eagerly = (...definitions: TestCapability[]) =>
  eager(...definitions.map(capability));

function buildAssembler(
  capabilities: ProfileCapability[],
  options: {
    asksForToolConfirmation?: boolean;
    allowances?: McpToolAllowance[];
    loadedCapabilityIds?: string[];
    canUseTools?: boolean;
  } = {},
) {
  const thread = aThread({ loadedCapabilityIds: options.loadedCapabilityIds });
  const refreshedThread = aThread({ id: thread.id });
  const createContext = jest.fn((input: RunCapabilityInput) =>
    Promise.resolve(
      aCapabilityContext({
        thread: input.thread,
        loadedCapabilityIds: new Set(input.thread.loadedCapabilityIds),
        canUseTools: options.canUseTools,
      }),
    ),
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
    personalContext: { memory: false, chatHistory: false },
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
    const { assemble } = buildAssembler(
      eagerly(
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
      ),
    );

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
    const { assemble } = buildAssembler(
      eagerly(
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
      ),
    );

    await assemble();

    expect(seen).toEqual([[], ['code_execution', 'map']]);
  });

  it('builds all capabilities from one shared context', async () => {
    const contexts: unknown[] = [];
    const { assemble, createContext } = buildAssembler(
      eagerly(
        { contribute: (ctx) => (contexts.push(ctx), {}) },
        { contribute: (ctx) => (contexts.push(ctx), {}) },
      ),
    );

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
      buildAssembler(eagerly({ contribute }));
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

  it('emits a named warning when a live profile refresh discovers an unavailable integration', async () => {
    let handle: RunProfileHandle | undefined;
    const warning = { integrationId: RATHAUS_ID, integrationName: 'Rathaus' };
    const contribute = jest
      .fn()
      .mockReturnValueOnce({
        hooks: [
          (run: RunProfileHandle): Hook => {
            handle = run;
            return { name: 'refresh-test' };
          },
        ],
      })
      .mockReturnValueOnce({ warnings: [warning] });
    const { assemble } = buildAssembler(eagerly({ contribute }));
    const assembled = await assemble();
    assembled.createHooks(new RuntimeToolIntegrationRegistry([]));
    const emit = jest.fn();
    await handle!.refresh({
      setTools: jest.fn(),
      setInstructions: jest.fn(),
      emit,
    });
    expect(emit).toHaveBeenCalledWith({
      name: 'mcp_integration_unavailable',
      data: warning,
    });
  });

  describe('tool confirmation', () => {
    const offering = (...tools: Tool[]) =>
      eagerly({ contribute: () => ({ tools }) });
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
      const { assemble, toRuntimeTools } = buildAssembler(
        eagerly({ contribute }),
      );
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

  describe('on-demand capabilities', () => {
    const ROUTINE_USAGE = '<routine_usage/>';
    const routineManagement = (overrides: Partial<RunCapability> = {}) =>
      capability({
        id: 'routine_management',
        description: 'Create and edit routines.',
        contribute: () => ({
          tools: [tool('create_routine'), tool('edit_routine')],
          sections: [{ slot: PromptSlot.TOOL_USAGE, content: ROUTINE_USAGE }],
          hooks: [() => ({ name: 'routine-hook' })],
        }),
        ...overrides,
      });
    const internet = capability({
      id: 'internet',
      description: 'Search the web.',
      contribute: () => ({ tools: [tool('internet_search')] }),
    });
    const seenByMcp: CapabilityAssemblyState[] = [];
    const mcp = capability({
      id: 'mcp',
      description: 'Integration tools.',
      contribute: (_ctx, state) => {
        seenByMcp.push(state);
        return {
          tools: [tool('create_routine'), tool('jira_search')].filter(
            (t) => !state.reservedToolNames.has(t.name),
          ),
        };
      },
    });
    const routineCatalogEntry = {
      id: 'routine_management',
      description: 'Create and edit routines.',
      toolNames: ['create_routine', 'edit_routine'],
    };

    function assembleWith(
      routines: RunCapability,
      options: { loadedCapabilityIds?: string[]; canUseTools?: boolean } = {},
    ) {
      const { assemble } = buildAssembler(
        [...eager(internet), ...onDemand(routines), ...eager(mcp)],
        options,
      );
      return assemble();
    }

    const names = (tools: readonly Tool[]) => tools.map((t) => t.name);

    beforeEach(() => {
      seenByMcp.length = 0;
    });

    it('offers nothing of an unloaded capability but lists it in the catalog with its tools', async () => {
      const assembled = await assembleWith(routineManagement());

      expect(names(assembled.tools)).toEqual([
        'internet_search',
        'jira_search',
      ]);
      expect(assembled.instructions).not.toContain(ROUTINE_USAGE);
      expect(assembled.capabilityCatalog).toEqual([routineCatalogEntry]);
      expect(
        assembled.createHooks(new RuntimeToolIntegrationRegistry([])),
      ).toEqual([]);
    });

    it('contributes a capability the thread has loaded and leaves it out of the catalog', async () => {
      const assembled = await assembleWith(routineManagement(), {
        loadedCapabilityIds: ['routine_management'],
      });

      expect(names(assembled.tools)).toEqual([
        'internet_search',
        'create_routine',
        'edit_routine',
        'jira_search',
      ]);
      expect(assembled.instructions).toContain(ROUTINE_USAGE);
      expect(assembled.capabilityCatalog).toEqual([]);
      expect(
        assembled
          .createHooks(new RuntimeToolIntegrationRegistry([]))
          .map((hook) => hook.name),
      ).toEqual(['routine-hook']);
    });

    it('contributes a capability the context requires without a stored id', async () => {
      const assembled = await assembleWith(
        routineManagement({ isRequiredBy: () => Promise.resolve(true) }),
      );

      expect(names(assembled.tools)).toContain('edit_routine');
      expect(assembled.instructions).toContain(ROUTINE_USAGE);
      expect(assembled.capabilityCatalog).toEqual([]);
    });

    it('leaves an unavailable capability, which contributes no tools, out of the tools and the catalog and reserves none of its names', async () => {
      const assembled = await assembleWith(
        routineManagement({
          contribute: () => ({
            sections: [{ slot: PromptSlot.TOOL_USAGE, content: ROUTINE_USAGE }],
          }),
        }),
      );

      expect(names(assembled.tools)).toEqual([
        'internet_search',
        'create_routine',
        'jira_search',
      ]);
      expect(assembled.instructions).not.toContain(ROUTINE_USAGE);
      expect(assembled.capabilityCatalog).toEqual([]);
    });

    it('ignores stored ids that are unknown or name an eager capability', async () => {
      const assembled = await assembleWith(routineManagement(), {
        loadedCapabilityIds: ['routines_v0', 'internet', 'mcp'],
      });

      expect(names(assembled.tools)).toEqual([
        'internet_search',
        'jira_search',
      ]);
      expect(assembled.capabilityCatalog).toEqual([routineCatalogEntry]);
    });

    it('keeps the tool names of an unloaded capability reserved and reports them as loadable', async () => {
      await assembleWith(routineManagement());

      expect([...seenByMcp[0].reservedToolNames]).toEqual([
        'internet_search',
        'create_routine',
        'edit_routine',
      ]);
      expect([...seenByMcp[0].loadableToolNames]).toEqual([
        'create_routine',
        'edit_routine',
      ]);
    });

    it('reports no loadable tool names once the capability is loaded', async () => {
      await assembleWith(routineManagement(), {
        loadedCapabilityIds: ['routine_management'],
      });

      expect(seenByMcp[0].reservedToolNames).toContain('create_routine');
      expect(seenByMcp[0].loadableToolNames.size).toBe(0);
    });

    it('contributes every capability as before when the model cannot use tools', async () => {
      const assembled = await assembleWith(routineManagement(), {
        canUseTools: false,
      });

      expect(names(assembled.tools)).toContain('edit_routine');
      expect(assembled.instructions).toContain(ROUTINE_USAGE);
      expect(assembled.capabilityCatalog).toEqual([]);
    });
  });
});
