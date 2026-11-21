import { ToolLoaderCapability } from 'src/domain/runs/application/run-capabilities/capabilities/tool-loader.capability';
import type { UUID } from 'crypto';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { SourceAssignment } from 'src/domain/threads/domain/thread-source-assignment.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { ArtifactToolAssemblerService } from 'src/domain/runs/application/services/artifact-tool-assembler.service';
import { McpToolAssemblerService } from 'src/domain/runs/application/services/mcp-tool-assembler.service';
import { RunCapabilityContextFactory } from 'src/domain/runs/application/run-capabilities/run-capability-context.factory';
import { AnonymizationCapability } from 'src/domain/runs/application/run-capabilities/capabilities/anonymization.capability';
import { ArtifactsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/artifacts.capability';
import { BehaviorCapability } from 'src/domain/runs/application/run-capabilities/capabilities/behavior.capability';
import { CodeExecutionCapability } from 'src/domain/runs/application/run-capabilities/capabilities/code-execution.capability';
import { CustomInstructionsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/custom-instructions.capability';
import { DataHandlingCapability } from 'src/domain/runs/application/run-capabilities/capabilities/data-handling.capability';
import { DateTimeCapability } from 'src/domain/runs/application/run-capabilities/capabilities/date-time.capability';
import { EmailCalendarCapability } from 'src/domain/runs/application/run-capabilities/capabilities/email-calendar.capability';
import { FilesChartsMapCapability } from 'src/domain/runs/application/run-capabilities/capabilities/files-charts-map.capability';
import { ImageGenerationCapability } from 'src/domain/runs/application/run-capabilities/capabilities/image-generation.capability';
import { InternetCapability } from 'src/domain/runs/application/run-capabilities/capabilities/internet.capability';
import { KnowledgeBasesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/knowledge-bases.capability';
import { LegalReferencesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/legal-references.capability';
import { RecordingsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/recordings.capability';
import { McpCapability } from 'src/domain/runs/application/run-capabilities/capabilities/mcp.capability';
import { SkillUseCapability } from 'src/domain/runs/application/run-capabilities/capabilities/skill-use.capability';
import { SkillManagementCapability } from 'src/domain/runs/application/run-capabilities/capabilities/skill-management.capability';
import { RoutinesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/routines.capability';
import { AnonymizationExceptionCapability } from 'src/domain/runs/application/run-capabilities/capabilities/anonymization-exception.capability';
import { ThreadSourcesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/thread-sources.capability';
import { WorkspaceInstructionsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/workspace-instructions.capability';
import { NotificationContextCapability } from 'src/domain/runs/application/run-capabilities/capabilities/notification-context.capability';
import { ReleaseNoteContextCapability } from 'src/domain/runs/application/run-capabilities/capabilities/release-note-context.capability';
import { OnboardingCapability } from 'src/domain/runs/application/run-capabilities/capabilities/onboarding.capability';
import { FeatureGuideCapability } from 'src/domain/runs/application/run-capabilities/capabilities/feature-guide.capability';
import { MemoryCapability } from 'src/domain/runs/application/run-capabilities/capabilities/memory.capability';
import { ChatHistoryCapability } from 'src/domain/runs/application/run-capabilities/capabilities/chat-history.capability';
import { AdoptionCapability } from 'src/domain/runs/application/run-capabilities/capabilities/adoption.capability';
import { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';
import { aNotification } from 'src/domain/notifications/application/testing/notification.fixtures';
import {
  aCapabilityContext,
  aThread,
  createAssembleToolUseCase,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/runs/testing/run-capability.fixture';
import { ChatRunProfile } from './chat-run-profile';
import { RunProfileAssembler } from './run-profile-assembler.service';
import { ThreadOriginKind } from 'src/domain/threads/domain/thread-origin';
import { OnboardingStage } from 'src/iam/onboarding/domain/value-objects/onboarding-stage.enum';
import { GuideFeature } from 'src/domain/threads/domain/guide-feature.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { DiagramArtifact } from 'src/domain/artifacts/domain/artifact.entity';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';

const integrationId = '33333333-3333-4333-8333-333333333333' as UUID;
const notification = aNotification({
  headline: 'Neue Verordnung zur Grundsteuer',
});

/** Who runs the chat: a member who may manage skills and routines by default. */
interface Principal {
  role?: UserRole;
  mayManage?: boolean;
}

function userContextOf({ role = UserRole.USER }: Principal) {
  return {
    get: (key: string) =>
      ({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
        role,
        systemRole: SystemRole.CUSTOMER,
      })[key],
  };
}

function buildChatProfile(
  memory?: MemoryEntry[],
  principal: Principal = {},
  artifacts: Artifact[] = [],
): ChatRunProfile {
  const { mayManage = true } = principal;
  const userContext = userContextOf(principal);
  const assembleTool = createAssembleToolUseCase();
  const resolved = <T>(value: T) => ({
    execute: jest.fn().mockResolvedValue(value),
  });
  const artifactTools = new ArtifactToolAssemblerService(
    assembleTool,
    resolved(artifacts) as never,
    resolved(null) as never,
    resolved([]) as never,
  );
  const mcpTools = new McpToolAssemblerService(
    resolved({
      tools: [
        {
          name: 'code.execution',
          description: 'Third-party code runner',
          inputSchema: { type: 'object', properties: {} },
          integrationId,
          fileParams: [],
        },
      ],
      resources: [],
      prompts: [],
      returnsPii: false,
    }) as never,
    resolved([
      { id: integrationId, name: 'Stadtwerke', logoUrl: null },
    ]) as never,
  );
  return new ChatRunProfile(
    new DateTimeCapability(),
    new DataHandlingCapability(),
    new AnonymizationCapability(),
    new BehaviorCapability(),
    new LegalReferencesCapability(),
    new CustomInstructionsCapability(
      resolved({ systemPrompt: 'Antworten Sie stets auf Deutsch.' }) as never,
      resolved(null) as never,
    ),
    new CodeExecutionCapability(assembleTool),
    new EmailCalendarCapability(assembleTool),
    new FilesChartsMapCapability(assembleTool),
    new ArtifactsCapability(artifactTools),
    new SkillUseCapability(assembleTool),
    new SkillManagementCapability(
      { enabled: false } as never,
      assembleTool,
      userContext as never,
      resolved(mayManage) as never,
    ),
    new RoutinesCapability(
      assembleTool,
      resolved(mayManage ? [] : null) as never,
    ),
    new AnonymizationExceptionCapability(assembleTool, userContext as never),
    new InternetCapability(
      resolved({ internetSearchEnabled: true }) as never,
      { get: () => true } as never,
      assembleTool,
    ),
    new ImageGenerationCapability(resolved({}) as never, assembleTool),
    new ThreadSourcesCapability(assembleTool),
    new KnowledgeBasesCapability(assembleTool),
    new RecordingsCapability(assembleTool, { get: () => true } as never),
    new NotificationContextCapability(
      resolved(notification) as never,
      { get: () => true } as never,
    ),
    new ReleaseNoteContextCapability(
      resolved(null) as never,
      { get: () => true } as never,
    ),
    new OnboardingCapability({ get: () => true } as never),
    new FeatureGuideCapability(
      { get: () => true } as never,
      userContext as never,
      resolved(true) as never,
    ),
    new WorkspaceInstructionsCapability(),
    new AdoptionCapability(),
    new MemoryCapability(resolved(memory) as never, assembleTool),
    new ChatHistoryCapability(assembleTool),
    new McpCapability(mcpTools),
  );
}

function assembleChat(
  options: {
    canUseTools?: boolean;
    isAnonymous?: boolean;
    activatedSkillName?: string;
    thread?: Thread;
    memory?: MemoryEntry[];
    principal?: Principal;
    artifacts?: Artifact[];
  } = {},
) {
  const resolved = <T>(value: T) =>
    ({ execute: jest.fn().mockResolvedValue(value) }) as never;
  const assembler = new RunProfileAssembler(
    new RunCapabilityContextFactory(
      resolved(undefined),
      resolved([]),
      resolved([
        { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Satzungen' },
      ]),
      resolved([]),
    ),
    resolved({}),
    { toRuntimeTools: jest.fn() } as never,
    resolved([]),
    new ToolLoaderCapability(createAssembleToolUseCase()),
  );
  const profile = buildChatProfile(
    options.memory,
    options.principal,
    options.artifacts,
  );
  return assembler.assemble(profile, {
    profile: { id: 'chat' },
    thread: options.thread ?? aThread({ mcpIntegrationIds: [integrationId] }),
    model: aCapabilityContext({ canUseTools: options.canUseTools ?? true })
      .model,
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
    isAnonymous: options.isAnonymous ?? false,
    personalContext: {
      memory: options.memory !== undefined,
      chatHistory: false,
    },
    activatedSkillName: options.activatedSkillName,
  });
}

describe('ChatRunProfile', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-06T10:23:45.000Z'));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('ends a run when the model stops calling tools', () => {
    expect(buildChatProfile().completionPolicy.decide({ nudges: 0 })).toEqual({
      status: 'done',
    });
  });

  it('offers a new chat only the eager tools and load_tools, MCP last before the loader', async () => {
    const { tools, capabilityCatalog } = await assembleChat();

    expect(tools.map((tool) => tool.name)).toEqual([
      ToolType.WEBSITE_CONTENT,
      ToolType.INTERNET_SEARCH,
      ToolType.KNOWLEDGE_QUERY,
      ToolType.KNOWLEDGE_GET_TEXT,
      `mcp__tool__code.execution__${integrationId.slice(0, 8)}`,
      ToolType.LOAD_TOOLS,
    ]);
    expect(capabilityCatalog.map((entry) => entry.id)).toEqual([
      'code_execution',
      'email_calendar',
      'files_charts_map',
      'artifacts',
      'skill_management',
      'routine_management',
      'image_generation',
      'recordings',
    ]);
  });

  it('lists no management groups for a member who may not manage skills or routines, and anonymization exceptions only for admins', async () => {
    const member = await assembleChat({ principal: { mayManage: false } });
    const admin = await assembleChat({ principal: { role: UserRole.ADMIN } });
    const ids = (run: typeof member) =>
      run.capabilityCatalog.map((entry) => entry.id);

    expect(ids(member)).not.toContain('skill_management');
    expect(ids(member)).not.toContain('routine_management');
    expect(ids(member)).not.toContain('anonymization_exceptions');
    expect(ids(admin)).toEqual(
      expect.arrayContaining([
        'skill_management',
        'routine_management',
        'anonymization_exceptions',
      ]),
    );
  });

  it('offers code_execution without loading in a chat with a ready CSV data source', async () => {
    const csv = new CSVDataSource({
      name: 'haushalt.csv',
      data: { headers: ['Posten', 'Betrag'], rows: [['Schulen', '1200']] },
      status: SourceStatus.READY,
    });

    const { tools, capabilityCatalog } = await assembleChat({
      thread: aThread({
        sourceAssignments: [new SourceAssignment({ source: csv })],
      }),
    });

    expect(tools.map((tool) => tool.name)).toContain(ToolType.CODE_EXECUTION);
    expect(capabilityCatalog.map((entry) => entry.id)).not.toContain(
      'code_execution',
    );
  });

  it('offers the artifact tools without loading in a chat that already has an artifact', async () => {
    const thread = aThread();
    const diagram = new DiagramArtifact({
      threadId: thread.id,
      userId: TEST_USER_ID,
      title: 'Ablauf Bauantrag',
    });

    const { tools, capabilityCatalog, instructions } = await assembleChat({
      thread,
      artifacts: [diagram],
    });

    expect(tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        ToolType.CREATE_DOCUMENT,
        ToolType.UPDATE_DIAGRAM,
      ]),
    );
    expect(instructions).toContain('<document_usage>');
    expect(capabilityCatalog.map((entry) => entry.id)).not.toContain(
      'artifacts',
    );
  });

  it('gives a chat about a notification its content after the stable prompt prefix, without routine tools', async () => {
    const { tools, instructions } = await assembleChat({
      thread: aThread({
        origin: {
          kind: ThreadOriginKind.NOTIFICATION,
          notificationId: notification.id,
        },
      }),
    });

    expect(instructions).toMatch(
      /^You are an AI assistant powered by Ayunis Core[\s\S]*<\/behavior_instructions>[\s\S]*<notification_under_discussion>[\s\S]*<headline>Neue Verordnung zur Grundsteuer<\/headline>[\s\S]*You are now ready to assist the user\.$/,
    );
    expect(tools.map((tool) => tool.name)).not.toContain(
      ToolType.SEND_NOTIFICATION,
    );
  });

  it('leads the user into skills and routines while their groups are unloaded, telling the model to load them first', async () => {
    const { instructions } = await assembleChat();

    expect(instructions).toMatch(
      /<feature_adoption>[\s\S]*create_skill[\s\S]*create_skill is in the tool group skill_management, which is not loaded yet\. Before you call it, call load_tools with \{"groups":\["skill_management"\]\}[\s\S]*create_routine is in the tool group routine_management[\s\S]*<\/feature_adoption>/,
    );
  });

  it('drops the load hint for a group the chat has loaded', async () => {
    const { tools, instructions } = await assembleChat({
      thread: aThread({ loadedCapabilityIds: ['routine_management'] }),
    });

    expect(tools.map((tool) => tool.name)).toContain(ToolType.CREATE_ROUTINE);
    expect(instructions).toContain('create_routine');
    expect(instructions).not.toContain('tool group routine_management');
    expect(instructions).toContain('tool group skill_management');
  });

  it('leads a profile onboarding chat into skills while skill management is unloaded', async () => {
    const { instructions } = await assembleChat({
      thread: aThread({
        origin: {
          kind: ThreadOriginKind.ONBOARDING,
          stage: OnboardingStage.PROFILE,
        },
      }),
      memory: [],
    });

    expect(instructions).toMatch(
      /<onboarding>[\s\S]*set_memory[\s\S]*create_skill[\s\S]*create_skill is in the tool group skill_management[\s\S]*<\/onboarding>/,
    );
  });

  it('gives a first-skill onboarding chat its instructions while skill management is unloaded', async () => {
    const { instructions } = await assembleChat({
      thread: aThread({
        origin: {
          kind: ThreadOriginKind.ONBOARDING,
          stage: OnboardingStage.FIRST_SKILL,
        },
      }),
      memory: [],
    });

    expect(instructions).toMatch(
      /<onboarding>\nThe user started this chat to set up skills[\s\S]*create_skill is in the tool group skill_management[\s\S]*<\/onboarding>/,
    );
  });

  it('offers create_skill in a skills feature-guide chat while skill management is unloaded, telling the model to load it first', async () => {
    const { instructions } = await assembleChat({
      thread: aThread({
        origin: {
          kind: ThreadOriginKind.FEATURE_GUIDE,
          feature: GuideFeature.SKILLS,
        },
      }),
    });

    expect(instructions).toMatch(
      /<feature_guide>[\s\S]*<next_step>[^<]*create_skill[^<]*create_skill is in the tool group skill_management, which is not loaded yet[\s\S]*<\/next_step>[\s\S]*<\/feature_guide>/,
    );
  });

  it('adds no notification to an ordinary chat', async () => {
    const { instructions } = await assembleChat();

    expect(instructions).not.toContain('<notification_under_discussion>');
  });

  it('starts the prompt with the date-only preamble so the cached prefix stays stable', async () => {
    const { instructions } = await assembleChat();

    expect(instructions).toMatch(
      /^You are an AI assistant powered by Ayunis Core[\s\S]*?<\/application_details>\n\n<context>\nCurrent date: 2026-11-06\n<\/context>\n\n<behavior_instructions>/,
    );
    expect(instructions).not.toContain('10:23');
  });

  it('ends with the custom instructions and the closing line', async () => {
    const { instructions } = await assembleChat();

    expect(instructions).toMatch(
      /<organization_instructions>[\s\S]*Antworten Sie stets auf Deutsch\.[\s\S]*<\/organization_instructions>\n\n<feature_adoption>[\s\S]*<\/feature_adoption>\n\nYou are now ready to assist the user\.$/,
    );
  });

  it('renders memory after the custom instructions, at the end of the cached prefix', async () => {
    const { tools, instructions } = await assembleChat({
      memory: [
        new MemoryEntry({
          userId: TEST_USER_ID,
          key: 'personal',
          content: 'Sachbearbeiterin im Bauamt',
        }),
      ],
    });

    expect(instructions).toMatch(
      /<\/organization_instructions>\n\n<feature_adoption>[\s\S]*<\/feature_adoption>\n\n<memory>[\s\S]*<personal>\nSachbearbeiterin im Bauamt\n<\/personal>[\s\S]*<\/memory>\n\nYou are now ready to assist the user\.$/,
    );
    const names = tools.map((tool) => tool.name);
    expect(names.indexOf(ToolType.SET_MEMORY)).toBe(names.length - 3);
  });

  it('appends the quick-action skill note after the closing line', async () => {
    const { instructions } = await assembleChat({
      activatedSkillName: 'Bauantrag prüfen',
    });

    expect(instructions).toMatch(
      /You are now ready to assist the user\.\n\n<already_activated_skill>\nSkill "Bauantrag prüfen" has already been activated/,
    );
  });

  it('keeps guidance, policies and thread files but offers no tools when the model cannot use tools', async () => {
    const thread = aThread({
      sourceAssignments: [
        new SourceAssignment({
          source: new FileSource({
            fileType: FileType.PDF,
            name: 'Haushaltsplan.pdf',
            type: TextType.FILE,
            status: SourceStatus.READY,
          }),
        }),
      ],
    });

    const { tools, instructions } = await assembleChat({
      canUseTools: false,
      thread,
    });

    expect(tools).toEqual([]);
    for (const section of [
      '<tool_guidelines>',
      '<file_usage>',
      '<document_usage>',
      '<available_files>',
      '<data_handling>',
      '<response_guidelines>',
      '<legal_references>',
      '<platform_information>',
    ]) {
      expect(instructions).toContain(section);
    }
    expect(instructions).not.toContain('<available_knowledge_bases>');
  });

  it('adds the anonymization rules only to anonymous runs', async () => {
    const anonymous = await assembleChat({ isAnonymous: true });
    const regular = await assembleChat();

    expect(anonymous.instructions).toContain('<anonymized_data>');
    expect(regular.instructions).not.toContain('<anonymized_data>');
  });
});
