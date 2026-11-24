import type { UUID } from 'crypto';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';
import { McpTool } from 'src/domain/mcp/domain/mcp-tool.entity';
import { RunInvalidInputError } from 'src/domain/runs/application/runs.errors';
import { RunCapabilityContextFactory } from 'src/domain/runs/application/run-capabilities/run-capability-context.factory';
import { AnonymizationCapability } from 'src/domain/runs/application/run-capabilities/capabilities/anonymization.capability';
import { CustomInstructionsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/custom-instructions.capability';
import { FinishRoutineCapability } from 'src/domain/runs/application/run-capabilities/capabilities/finish-routine.capability';
import { InternetCapability } from 'src/domain/runs/application/run-capabilities/capabilities/internet.capability';
import { RoutineContextCapability } from 'src/domain/runs/application/run-capabilities/capabilities/routine-context.capability';
import { RoutineInternetCapability } from 'src/domain/runs/application/run-capabilities/capabilities/routine-internet.capability';
import { NotificationsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/notifications.capability';
import { McpCapability } from 'src/domain/runs/application/run-capabilities/capabilities/mcp.capability';
import { KnowledgeBasesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/knowledge-bases.capability';
import { KnowledgeBaseAssignment } from 'src/domain/threads/domain/thread-knowledge-base-assignment.entity';
import { McpToolAssemblerService } from 'src/domain/runs/application/services/mcp-tool-assembler.service';
import {
  aCapabilityContext,
  aThread,
  createAssembleToolUseCase,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/runs/testing/run-capability.fixture';
import { ThreadOriginKind } from 'src/domain/threads/domain/thread-origin';
import { RoutineRunProfile } from './routine-run-profile';
import { RunProfileAssembler } from './run-profile-assembler.service';

const integrationId = '33333333-3333-4333-8333-333333333333' as UUID;
const routineKnowledgeBase = {
  id: '66666666-6666-4666-8666-666666666666' as UUID,
  name: 'Satzungen',
};
const activatedKnowledgeBase = {
  id: '77777777-7777-4777-8777-777777777777' as UUID,
  name: 'Persönliche Notizen',
};

const resolved = <T>(value: T) =>
  ({ execute: jest.fn().mockResolvedValue(value) }) as never;

function buildRoutineProfile(orgAllowsInternet = true): RoutineRunProfile {
  const assembleTool = createAssembleToolUseCase();
  return new RoutineRunProfile(
    new RoutineContextCapability(),
    new AnonymizationCapability(),
    new CustomInstructionsCapability(
      resolved({ systemPrompt: 'Antworten Sie stets auf Deutsch.' }),
      resolved({ systemPrompt: 'Ich arbeite im Ordnungsamt Musterstadt.' }),
    ),
    new RoutineInternetCapability(
      new InternetCapability(
        resolved({ internetSearchEnabled: orgAllowsInternet }),
        { get: () => true } as never,
        assembleTool,
      ),
    ),
    new NotificationsCapability(assembleTool, { get: () => true } as never),
    new FinishRoutineCapability(assembleTool),
    new McpCapability(
      new McpToolAssemblerService(
        resolved({
          tools: [
            new McpTool(
              'tickets.create',
              'Create a ticket',
              { type: 'object', properties: {} },
              integrationId,
            ),
          ],
          resources: [],
          prompts: [],
          returnsPii: false,
        }),
        resolved([{ id: integrationId, name: 'Ticketsystem', logoUrl: null }]),
      ),
    ),
    new KnowledgeBasesCapability(assembleTool),
  );
}

function assembleRoutine(
  options: {
    internetEnabled?: boolean;
    orgAllowsInternet?: boolean;
    canUseTools?: boolean;
    isAnonymous?: boolean;
    extraTools?: Tool[];
    mcpIntegrationIds?: UUID[];
    knowledgeBases?: { id: UUID; name: string }[];
  } = {},
) {
  const assembler = new RunProfileAssembler(
    new RunCapabilityContextFactory(
      resolved(undefined),
      resolved([]),
      resolved([activatedKnowledgeBase]),
      resolved([]),
    ),
    resolved({}),
    { toRuntimeTools: jest.fn() } as never,
    resolved([]),
  );
  const profile = buildRoutineProfile(options.orgAllowsInternet);
  const capabilities = [
    ...profile.capabilities,
    { contribute: () => ({ tools: options.extraTools ?? [] }) },
  ];
  return assembler.assemble(
    { ...profile, capabilities },
    {
      profile: {
        id: 'routine',
        routine: {
          name: 'Verkündungsplattform prüfen',
          internetEnabled: options.internetEnabled ?? true,
        },
      },
      thread: aThread({
        origin: {
          kind: ThreadOriginKind.ROUTINE,
          routineId: '44444444-4444-4444-8444-444444444444',
        },
        mcpIntegrationIds: options.mcpIntegrationIds ?? [],
        knowledgeBaseAssignments: (options.knowledgeBases ?? []).map(
          (knowledgeBase) => new KnowledgeBaseAssignment({ knowledgeBase }),
        ),
      }),
      model: aCapabilityContext({ canUseTools: options.canUseTools ?? true })
        .model,
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      isAnonymous: options.isAnonymous ?? false,
      personalContext: { memory: false, chatHistory: false },
    },
  );
}

describe('RoutineRunProfile', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-06T06:00:00.000Z'));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('offers the web tools, send_notification and finish_routine when the routine and the org allow internet access', async () => {
    const { tools } = await assembleRoutine();

    expect(tools.map((tool) => tool.name)).toEqual([
      ToolType.WEBSITE_CONTENT,
      ToolType.INTERNET_SEARCH,
      ToolType.SEND_NOTIFICATION,
      ToolType.FINISH_ROUTINE,
    ]);
  });

  it('offers only send_notification and finish_routine when the routine has internet access turned off', async () => {
    const { tools } = await assembleRoutine({ internetEnabled: false });

    expect(tools.map((tool) => tool.name)).toEqual([
      ToolType.SEND_NOTIFICATION,
      ToolType.FINISH_ROUTINE,
    ]);
  });

  it('offers only send_notification and finish_routine when the org disabled internet access', async () => {
    const { tools } = await assembleRoutine({ orgAllowsInternet: false });

    expect(tools.map((tool) => tool.name)).toEqual([
      ToolType.SEND_NOTIFICATION,
      ToolType.FINISH_ROUTINE,
    ]);
  });

  it("offers the tools of the routine thread's integrations", async () => {
    const { tools } = await assembleRoutine({
      mcpIntegrationIds: [integrationId],
    });

    expect(tools.map((tool) => tool.name)).toEqual([
      ToolType.WEBSITE_CONTENT,
      ToolType.INTERNET_SEARCH,
      ToolType.SEND_NOTIFICATION,
      ToolType.FINISH_ROUTINE,
      `mcp__tool__tickets.create__${integrationId.slice(0, 8)}`,
    ]);
  });

  it("queries only the routine thread's knowledge bases, not the ones the user activated for chat", async () => {
    const { tools, instructions } = await assembleRoutine({
      knowledgeBases: [routineKnowledgeBase],
    });

    expect(tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        ToolType.KNOWLEDGE_QUERY,
        ToolType.KNOWLEDGE_GET_TEXT,
      ]),
    );
    expect(instructions).toContain(routineKnowledgeBase.id);
    expect(instructions).not.toContain(activatedKnowledgeBase.id);
  });

  it('offers no knowledge tools to a routine without knowledge bases, even when the user activated some', async () => {
    const { tools } = await assembleRoutine();

    expect(tools.map((tool) => tool.name)).not.toContain(
      ToolType.KNOWLEDGE_QUERY,
    );
  });

  it('tells the model to notify only about something important and otherwise finish silently', async () => {
    const { instructions } = await assembleRoutine();

    expect(instructions).toMatch(
      /<unattended_run>[\s\S]*important[\s\S]*send_notification[\s\S]*then call finish_routine[\s\S]*nothing important[\s\S]*finish_routine without sending a notification[\s\S]*<\/unattended_run>/,
    );
  });

  it('starts the prompt with the unattended preamble and the routine name', async () => {
    const { instructions } = await assembleRoutine();

    expect(instructions).toMatch(
      /^You are an AI assistant powered by Ayunis Core[\s\S]*nobody reads your text replies[\s\S]*Do not ask questions[\s\S]*call finish_routine[\s\S]*<\/unattended_run>\n\n<routine>\nName: Verkündungsplattform prüfen\n/,
    );
  });

  it('includes the org and user custom instructions', async () => {
    const { instructions } = await assembleRoutine();

    expect(instructions).toContain('Antworten Sie stets auf Deutsch.');
    expect(instructions).toContain('Ich arbeite im Ordnungsamt Musterstadt.');
  });

  it('ends the prompt with the current Berlin date and time, after everything that stays the same', async () => {
    const { instructions } = await assembleRoutine();

    expect(instructions).toMatch(
      /Ich arbeite im Ordnungsamt Musterstadt\.\n<\/user_instructions>\n\n<context>\nCurrent date and time: Friday, 2026-11-06, 07:00 \(Europe\/Berlin\)\n<\/context>$/,
    );
    expect(instructions.indexOf('07:00')).toBe(
      instructions.lastIndexOf('07:00'),
    );
  });

  it('adds the anonymization rules only to anonymous runs', async () => {
    const anonymous = await assembleRoutine({ isAnonymous: true });
    const regular = await assembleRoutine();

    expect(anonymous.instructions).toContain('<anonymized_data>');
    expect(regular.instructions).not.toContain('<anonymized_data>');
  });

  it('rejects a model that cannot use tools', async () => {
    await expect(
      assembleRoutine({ canUseTools: false }),
    ).rejects.toBeInstanceOf(RunInvalidInputError);
  });

  it('never waits for a confirmation nobody can give, even for an MCP tool the owner has not always allowed', async () => {
    const mcpTool = new McpIntegrationTool(
      new McpTool(
        'create_ticket',
        undefined,
        { type: 'object' },
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      ),
      false,
      'Rathaus',
      null,
    );

    const { tools, toolsNeedingApproval } = await assembleRoutine({
      extraTools: [mcpTool],
    });

    expect(tools).toContain(mcpTool);
    expect(toolsNeedingApproval.size).toBe(0);
  });

  it('caps a run at fewer iterations than a chat', () => {
    expect(buildRoutineProfile().maxIterations).toBe(20);
  });
});
